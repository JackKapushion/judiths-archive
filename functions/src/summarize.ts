import Anthropic from '@anthropic-ai/sdk'

// Rough token estimate: ~4 characters per token for English text.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function estimateMessagesTokens(
  messages: Anthropic.Messages.MessageParam[],
): number {
  let total = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += estimateTokens(msg.content)
    }
  }
  return total
}

// When conversation history exceeds this many estimated tokens,
// older messages get summarized. This leaves room for the system prompt
// (~15K), tool results per turn, and the response.
const SUMMARIZE_THRESHOLD = 50_000

// Keep this many of the most recent messages verbatim (user + assistant pairs).
// These give Claude immediate conversational context.
const KEEP_RECENT = 10

/**
 * If the conversation history is long enough, summarizes older messages
 * and returns a shorter message list with the summary prepended.
 * Returns null if no summarization was needed.
 */
export async function maybeSummarize(
  messages: Anthropic.Messages.MessageParam[],
  existingSummary: string | null,
): Promise<{ messages: Anthropic.Messages.MessageParam[]; summary: string } | null> {
  const totalTokens = estimateMessagesTokens(messages)

  if (totalTokens < SUMMARIZE_THRESHOLD) {
    return null
  }

  // Split: older messages get summarized, recent ones stay verbatim
  const splitPoint = Math.max(0, messages.length - KEEP_RECENT)
  const olderMessages = messages.slice(0, splitPoint)
  const recentMessages = messages.slice(splitPoint)

  if (olderMessages.length === 0) {
    return null
  }

  // Build the text to summarize. If there's an existing summary from a
  // previous round, include it so context accumulates.
  let textToSummarize = ''

  if (existingSummary) {
    textToSummarize += `Previous conversation summary:\n${existingSummary}\n\n---\n\nAdditional messages to incorporate:\n\n`
  }

  for (const msg of olderMessages) {
    const content = typeof msg.content === 'string' ? msg.content : '[tool interaction]'
    textToSummarize += `${msg.role}: ${content}\n\n`
  }

  const anthropic = new Anthropic()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system:
      'Summarize this conversation history concisely. Preserve key facts, decisions, ' +
      'document references, and any specific information the user asked about. ' +
      'The summary will be used to maintain context in a long conversation about ' +
      'an archive of documents. Keep it factual and information-dense.',
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation:\n\n${textToSummarize}`,
      },
    ],
  })

  const summary =
    response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

  if (!summary) {
    return null
  }

  // Build the new message list: summary as a system-like user message, then recent messages.
  // The summary goes as the first user message so Claude has the context.
  const summarizedMessages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content:
        `[This is a continuation of a longer conversation. Here is a summary of the earlier discussion:]\n\n${summary}\n\n[The conversation continues below with the most recent messages.]`,
    },
    {
      role: 'assistant',
      content: 'Understood, I have the context from our earlier conversation. How can I help?',
    },
    ...recentMessages,
  ]

  return { messages: summarizedMessages, summary }
}
