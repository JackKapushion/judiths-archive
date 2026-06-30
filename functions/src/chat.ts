import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import Anthropic from '@anthropic-ai/sdk'
import { generateTitle } from './auto-title'
import { tools, executeToolCall, buildSystemPrompt } from './retrieval'
import type { ChatRequest, ChatEvent, Conversation, Message } from './types'

const db = getFirestore()
const MAX_TOOL_ROUNDS = 5

function sendEvent(res: import('express').Response, event: ChatEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export const chat = onRequest(
  {
    cors: true,
    concurrency: 1,
    maxInstances: 10,
    timeoutSeconds: 120,
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

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      // Get or create conversation
      let convoId = conversationId
      let isFirstMessage = false

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
      } else {
        const convoSnap = await db.collection('conversations').doc(convoId).get()
        if (!convoSnap.exists || convoSnap.data()?.userId !== uid) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        const data = convoSnap.data()
        isFirstMessage = data?.title === 'New conversation' && data?.messageCount === 0
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

      // Load conversation history
      const historySnap = await messagesRef
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get()

      const apiMessages: Anthropic.Messages.MessageParam[] = historySnap.docs.map((d) => {
        const data = d.data() as Message
        return { role: data.role, content: data.content }
      })

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages: apiMessages,
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullResponse += event.delta.text
            sendEvent(res, { type: 'content_delta', text: event.delta.text })
          }
        }

        const finalMessage = await stream.finalMessage()

        // Log cache performance on first round
        if (round === 0 && finalMessage.usage) {
          const usage = finalMessage.usage as Anthropic.Messages.Usage & {
            cache_creation_input_tokens?: number
            cache_read_input_tokens?: number
          }
          console.log(
            `Cache: created=${usage.cache_creation_input_tokens ?? 0}, ` +
              `read=${usage.cache_read_input_tokens ?? 0}, ` +
              `input=${usage.input_tokens}, output=${usage.output_tokens}`,
          )
        }

        // Extract tool_use blocks
        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
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

      // Update conversation metadata
      await db
        .collection('conversations')
        .doc(convoId)
        .update({
          lastMessageAt: FieldValue.serverTimestamp(),
          messageCount: FieldValue.increment(2),
        })

      // Auto-generate title on first exchange
      if (isFirstMessage) {
        generateTitle(convoId, message, fullResponse).catch((err) =>
          console.error('Title generation failed:', err),
        )
      }

      sendEvent(res, { type: 'done', messageId: assistantMsg.id })
      res.end()
    } catch (err) {
      console.error('Chat error:', err)
      sendEvent(res, {
        type: 'error',
        error: 'Something went wrong generating a response.',
      })
      res.end()
    }
  },
)
