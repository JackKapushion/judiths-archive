import { getFirestore } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'

const db = getFirestore()

/**
 * Generates a short title for a conversation based on the first exchange.
 * Called fire-and-forget from the chat function after the first response completes.
 */
export async function generateTitle(
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  const anthropic = new Anthropic()

  let response: Anthropic.Messages.Message
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 30,
      system:
        'Generate a concise 3-8 word title for this conversation. Return ONLY the title text, nothing else. No quotes, no punctuation at the end.',
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantResponse },
        { role: 'user', content: 'Generate a title for this conversation.' },
      ],
    })
  } catch (err) {
    console.error(`[AUTO_TITLE] Anthropic API call failed for conversation ${conversationId}:`, err)
    return
  }

  // Guard against empty content array (shouldn't happen but prevents
  // a crash if the API returns an unexpected response shape)
  const title =
    response.content.length > 0 && response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Untitled conversation'

  try {
    await db.collection('conversations').doc(conversationId).update({ title })
  } catch (err) {
    console.error(`[AUTO_TITLE] Firestore update failed for conversation ${conversationId}:`, err)
  }
}
