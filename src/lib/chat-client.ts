import { auth } from './firebase'
import type { ChatEvent } from './conversations'

const CHAT_URL = import.meta.env.VITE_CHAT_FUNCTION_URL || '/api/chat'

export interface ChatStreamCallbacks {
  onConversationCreated: (conversationId: string) => void
  onStatus: (text: string) => void
  onContentDelta: (text: string) => void
  onDone: (messageId: string) => void
  onError: (error: string) => void
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    callbacks.onError('You must be signed in to chat.')
    return
  }

  const token = await user.getIdToken()

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      conversationId: conversationId ?? undefined,
    }),
  })

  if (!response.ok || !response.body) {
    callbacks.onError('Failed to connect to chat. Please try again.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      try {
        const event: ChatEvent = JSON.parse(line.slice(6))
        switch (event.type) {
          case 'conversation_created':
            callbacks.onConversationCreated(event.conversationId)
            break
          case 'status':
            callbacks.onStatus(event.text)
            break
          case 'content_delta':
            callbacks.onContentDelta(event.text)
            break
          case 'done':
            callbacks.onDone(event.messageId)
            break
          case 'error':
            callbacks.onError(event.error)
            break
        }
      } catch {
        // Skip malformed events
      }
    }
  }
}
