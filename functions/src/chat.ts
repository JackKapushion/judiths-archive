import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import Anthropic from '@anthropic-ai/sdk'
import { generateTitle } from './auto-title'
import { maybeSummarize } from './summarize'
import { tools, executeToolCall, buildSystemPrompt } from './retrieval'
import { computeCost, getMonthlyCounterPath, getDailyCounterPath, MONTHLY_COST_CAP } from './pricing'
import type { ChatRequest, ChatEvent, Conversation, Message } from './types'

const db = getFirestore()
// 7 rounds lets Claude do thorough multi-document research (search → outline →
// read → search again → read another doc → synthesize) without running up
// unlimited API costs. Most questions resolve in 3-4 rounds.
const MAX_TOOL_ROUNDS = 7

// Rate limit: 20 messages per rolling 1-hour window per user.
// Generous enough for real exploration, blocks scripted abuse.
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check and increment the user's message count. Uses a simple rolling window:
 * stores {count, windowStart} in Firestore. If the window has expired, reset.
 * Returns true if the request is allowed, false if rate limited.
 */
async function checkRateLimit(uid: string): Promise<boolean> {
  const ref = db.collection('rate_limits').doc(uid)
  const now = Date.now()

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data() as { count: number; windowStart: number } | undefined

    if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      // First request or window expired, start a new window
      tx.set(ref, { count: 1, windowStart: now })
      return true
    }

    if (data.count >= RATE_LIMIT_MAX) {
      return false
    }

    tx.update(ref, { count: data.count + 1 })
    return true
  })
}

function sendEvent(res: import('express').Response, event: ChatEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export const chat = onRequest(
  {
    cors: true,
    concurrency: 1,
    maxInstances: 10,
    // 540s (9 min) gives plenty of headroom for multi-round tool use.
    // Each round includes an Anthropic API call (~10-60s) plus tool
    // execution. 7 rounds max could hit ~7 min in extreme cases.
    // MAX_TOOL_ROUNDS is the real cost/runaway protection, not this.
    timeoutSeconds: 540,
    secrets: ['ANTHROPIC_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify auth
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing auth token' })
      return
    }

    let uid: string
    try {
      const token = authHeader.split('Bearer ')[1]
      const decoded = await getAuth().verifyIdToken(token)
      uid = decoded.uid
    } catch {
      res.status(401).json({ error: 'Invalid auth token' })
      return
    }

    const { conversationId, message } = req.body as ChatRequest

    if (!message?.trim()) {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    // Cap input length to prevent context window blowout and runaway costs.
    // 4000 chars is plenty for any reasonable question about the archive.
    if (message.length > 4000) {
      res.status(400).json({ error: 'Message is too long. Please keep it under 4000 characters.' })
      return
    }

    // Rate limit check before doing any expensive work.
    // Returns a normal HTTP error (not SSE) so the client can display it.
    const allowed = await checkRateLimit(uid)
    if (!allowed) {
      res.status(429).json({
        error: 'You\'ve sent a lot of messages recently. Please wait a bit before sending more.',
      })
      return
    }

    // Monthly spending cap: block new messages if this month's estimated
    // cost has exceeded the cap. Reads one Firestore doc per request,
    // which is cheap compared to the Anthropic API call it gates.
    const monthlyCounterPath = getMonthlyCounterPath()
    const monthlySnap = await db.doc(monthlyCounterPath).get()
    const monthlyData = monthlySnap.data() ?? {}
    const monthlyCost = computeCost({
      inputTokens: (monthlyData.totalInputTokens as number) ?? 0,
      outputTokens: (monthlyData.totalOutputTokens as number) ?? 0,
      cacheCreationTokens: (monthlyData.totalCacheCreationTokens as number) ?? 0,
      cacheReadTokens: (monthlyData.totalCacheReadTokens as number) ?? 0,
    })

    if (monthlyCost >= MONTHLY_COST_CAP) {
      console.error(`[SPENDING_CAP] Monthly cost cap reached: $${monthlyCost.toFixed(2)} >= $${MONTHLY_COST_CAP}`)
      res.status(503).json({
        error: 'Chat is temporarily unavailable due to high usage this month. Please try again next month.',
      })
      return
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    sendEvent(res, { type: 'status', text: 'Thinking...' })

    // SSE heartbeat: send a comment every 15 seconds to keep the connection
    // alive through any intermediate proxies (Cloud Run, load balancers, etc.).
    // SSE comments (lines starting with ":") are ignored by the client parser
    // but reset idle timeouts on the TCP connection.
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n')
    }, 15_000)

    // Declared outside try so the catch block can access it to
    // clear the 'generating' status on error.
    let convoId = conversationId

    try {
      // Get or create conversation
      let isFirstMessage = false
      let existingSummary: string | null = null

      if (!convoId) {
        const convoData: Omit<Conversation, 'createdAt' | 'lastMessageAt'> & {
          createdAt: FieldValue
          lastMessageAt: FieldValue
        } = {
          userId: uid,
          title: 'New conversation',
          messageCount: 0,
          isArchived: false,
          createdAt: FieldValue.serverTimestamp(),
          lastMessageAt: FieldValue.serverTimestamp(),
        }

        const convoRef = await db.collection('conversations').add(convoData)
        convoId = convoRef.id
        isFirstMessage = true

        sendEvent(res, { type: 'conversation_created', conversationId: convoId })

        // Increment conversation counters across all three time scopes:
        // global (all-time), monthly (cap tracking), daily (today/28-day).
        // These live in separate docs so they survive conversation deletions.
        const convoIncrement = { totalConversations: FieldValue.increment(1) }
        db.doc('counters/global').set(convoIncrement, { merge: true }).catch(() => {})
        db.doc(monthlyCounterPath).set(convoIncrement, { merge: true }).catch(() => {})
        db.doc(getDailyCounterPath()).set(convoIncrement, { merge: true }).catch(() => {})
      } else {
        const convoSnap = await db.collection('conversations').doc(convoId).get()
        if (!convoSnap.exists || convoSnap.data()?.userId !== uid) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        const data = convoSnap.data()
        isFirstMessage = data?.title === 'New conversation' && data?.messageCount === 0
        existingSummary = data?.summary ?? null
      }

      const messagesRef = db
        .collection('conversations')
        .doc(convoId)
        .collection('messages')

      // Write the user's message
      await messagesRef.add({
        role: 'user',
        content: message,
        status: 'complete',
        createdAt: FieldValue.serverTimestamp(),
      } satisfies Omit<Message, 'createdAt'> & { createdAt: FieldValue })

      // Mark conversation as generating so the frontend can show a typing
      // indicator even if the user navigates away and comes back mid-generation.
      await db.collection('conversations').doc(convoId).update({
        status: 'generating',
      })

      // Load conversation history
      const historySnap = await messagesRef
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get()

      let apiMessages: Anthropic.Messages.MessageParam[] = historySnap.docs.map((d) => {
        const data = d.data() as Message
        return { role: data.role, content: data.content }
      })

      // Summarize older messages if history is too long for the context window.
      // This keeps recent messages verbatim and compresses older ones into a summary.
      const summarizeResult = await maybeSummarize(apiMessages, existingSummary)
      if (summarizeResult) {
        apiMessages = summarizeResult.messages
        // Persist the summary so future requests don't re-summarize the same content
        await db.collection('conversations').doc(convoId).update({
          summary: summarizeResult.summary,
        })
      }

      // Build system prompt with document metadata index.
      // cache_control marks this as cacheable - it's large and identical on every
      // request, so Anthropic caches it server-side. Cache reads cost 0.1x the
      // normal input token price (90% savings).
      const systemPrompt: Anthropic.Messages.TextBlockParam[] = [
        {
          type: 'text',
          text: buildSystemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ]

      const anthropic = new Anthropic()
      let fullResponse = ''

      // Accumulate token usage across all tool-use rounds for cost tracking.
      // Stored on the conversation document after completion so the admin
      // dashboard can compute costs without reading individual messages.
      let totalInputTokens = 0
      let totalOutputTokens = 0
      let totalCacheCreationTokens = 0
      let totalCacheReadTokens = 0

      // --- Agentic tool-use loop ---
      //
      // Claude sees the document index in the system prompt and decides which
      // documents to search/read. Each iteration:
      //  1. Claude either produces text (streamed to client) or tool_use blocks
      //  2. If tool_use: execute the tools, send results back, loop again
      //  3. If end_turn: final answer was streamed, we're done
      //
      // The streaming works across all iterations - during retrieval rounds,
      // any "thinking out loud" text from Claude gets streamed too. During
      // the final round, the actual answer streams token by token.

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const stream = anthropic.messages.stream({
          // Sonnet 5 for good quality at reasonable cost ($3/$15 per MTok).
          // Strong at following voice instructions and multi-document synthesis.
          model: 'claude-sonnet-5',
          // Lower token cap encourages concise, conversational responses.
          // The system prompt also instructs the model to keep it short.
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages: apiMessages,
        })

        for await (const event of stream) {
          // Send a status as soon as the model starts generating a tool call.
          // Without this, there's a dead gap between the last text token and
          // tool execution where the frontend has no indicator that work is
          // happening (the model is silently generating tool call JSON).
          if (
            event.type === 'content_block_start' &&
            event.content_block.type === 'tool_use'
          ) {
            sendEvent(res, { type: 'status', text: 'Searching the archive...' })
          }
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullResponse += event.delta.text
            sendEvent(res, { type: 'content_delta', text: event.delta.text })
          }
        }

        const finalMessage = await stream.finalMessage()

        // Accumulate token usage for cost tracking, log on first round
        if (finalMessage.usage) {
          const usage = finalMessage.usage as Anthropic.Messages.Usage & {
            cache_creation_input_tokens?: number
            cache_read_input_tokens?: number
          }
          totalInputTokens += usage.input_tokens ?? 0
          totalOutputTokens += usage.output_tokens ?? 0
          totalCacheCreationTokens += usage.cache_creation_input_tokens ?? 0
          totalCacheReadTokens += usage.cache_read_input_tokens ?? 0

          if (round === 0) {
            console.log(
              `Cache: created=${usage.cache_creation_input_tokens ?? 0}, ` +
                `read=${usage.cache_read_input_tokens ?? 0}, ` +
                `input=${usage.input_tokens}, output=${usage.output_tokens}`,
            )
          }
        }

        // Extract tool_use blocks
        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
        )

        console.log(
          `Round ${round}: stop=${finalMessage.stop_reason}, ` +
          `tools=${toolUseBlocks.length}, text=${fullResponse.length} chars`,
        )

        // If no tool calls, Claude gave its final answer (already streamed)
        if (finalMessage.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
          break
        }

        // Claude wants to use tools - execute them and continue
        apiMessages.push({ role: 'assistant', content: finalMessage.content })

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
        for (const toolCall of toolUseBlocks) {
          const statusText =
            toolCall.name === 'search_documents'
              ? 'Searching archive...'
              : toolCall.name === 'get_document_outline'
                ? 'Checking document outline...'
                : 'Reading document...'
          sendEvent(res, { type: 'status', text: statusText })

          const result = executeToolCall(
            toolCall.name,
            toolCall.input as Record<string, unknown>,
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: result,
          })
        }

        apiMessages.push({ role: 'user', content: toolResults })
      }

      // Write the assistant's response to Firestore
      const assistantMsg = await messagesRef.add({
        role: 'assistant',
        content: fullResponse,
        status: 'complete',
        createdAt: FieldValue.serverTimestamp(),
      } satisfies Omit<Message, 'createdAt'> & { createdAt: FieldValue })

      // Update conversation metadata, token usage, and clear generating status.
      // Token usage uses FieldValue.increment so multiple messages in the same
      // conversation accumulate correctly (each message adds its tokens).
      await db
        .collection('conversations')
        .doc(convoId)
        .update({
          lastMessageAt: FieldValue.serverTimestamp(),
          messageCount: FieldValue.increment(2),
          status: 'idle',
          'tokenUsage.inputTokens': FieldValue.increment(totalInputTokens),
          'tokenUsage.outputTokens': FieldValue.increment(totalOutputTokens),
          'tokenUsage.cacheCreationTokens': FieldValue.increment(totalCacheCreationTokens),
          'tokenUsage.cacheReadTokens': FieldValue.increment(totalCacheReadTokens),
        })

      // Increment lifetime counters for messages and tokens.
      // Separate from per-conversation tracking so totals persist
      // even if a user deletes their conversation.
      db.doc('counters/global').set({
        totalMessages: FieldValue.increment(2),
        totalInputTokens: FieldValue.increment(totalInputTokens),
        totalOutputTokens: FieldValue.increment(totalOutputTokens),
        totalCacheCreationTokens: FieldValue.increment(totalCacheCreationTokens),
        totalCacheReadTokens: FieldValue.increment(totalCacheReadTokens),
      }, { merge: true }).catch(() => {})

      // Increment monthly counters for spending cap enforcement.
      // Each month gets its own doc (e.g. counters/monthly-2026-07)
      // so there's no reset logic needed. Old months just stay as history.
      db.doc(monthlyCounterPath).set({
        totalMessages: FieldValue.increment(2),
        totalInputTokens: FieldValue.increment(totalInputTokens),
        totalOutputTokens: FieldValue.increment(totalOutputTokens),
        totalCacheCreationTokens: FieldValue.increment(totalCacheCreationTokens),
        totalCacheReadTokens: FieldValue.increment(totalCacheReadTokens),
      }, { merge: true }).catch(() => {})

      // Increment daily counters for the dashboard's today/28-day cost
      // breakdown. Same pattern as monthly: one doc per day, no resets.
      db.doc(getDailyCounterPath()).set({
        totalMessages: FieldValue.increment(2),
        totalInputTokens: FieldValue.increment(totalInputTokens),
        totalOutputTokens: FieldValue.increment(totalOutputTokens),
        totalCacheCreationTokens: FieldValue.increment(totalCacheCreationTokens),
        totalCacheReadTokens: FieldValue.increment(totalCacheReadTokens),
      }, { merge: true }).catch(() => {})

      // Auto-generate title on first exchange
      if (isFirstMessage) {
        generateTitle(convoId, message, fullResponse).catch((err) =>
          console.error('Title generation failed:', err),
        )
      }

      sendEvent(res, { type: 'done', messageId: assistantMsg.id })
      clearInterval(heartbeat)
      res.end()
    } catch (err) {
      console.error('Chat error:', err)
      // Clear generating status so the frontend doesn't show a perpetual
      // typing indicator. convoId is always set by this point (either
      // from the input param or from creating a new conversation above).
      if (convoId) {
        await db.collection('conversations').doc(convoId).update({
          status: 'idle',
          errorCount: FieldValue.increment(1),
        }).catch(() => {})
      }

      // Detect Anthropic billing/rate limit errors so users see a clear
      // message instead of a vague "something went wrong." This covers
      // the case where Anthropic's org spending limit ($100) is hit
      // before the app's own cap catches it (e.g., if other API usage
      // ate into the budget).
      let errorMessage = 'Something went wrong generating a response.'
      if (err instanceof Anthropic.RateLimitError) {
        errorMessage = 'Chat is temporarily unavailable due to high demand. Please try again later.'
      } else if (err instanceof Anthropic.APIError && err.status === 402) {
        // 402 = payment required (credits exhausted)
        errorMessage = 'Chat is temporarily unavailable. Please try again later.'
      }

      sendEvent(res, {
        type: 'error',
        error: errorMessage,
      })
      clearInterval(heartbeat)
      res.end()
    }
  },
)
