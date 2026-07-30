import { signInAnonymously } from 'firebase/auth'
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

// How long to wait for any data (including heartbeat comments) before
// assuming the connection is dead. Uses AbortController so the timer
// resets cleanly on each chunk instead of leaking stale setTimeout handles.
const READER_TIMEOUT_MS = 90_000

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  let user = auth.currentUser
  if (!user) {
    try {
      const result = await signInAnonymously(auth)
      user = result.user
    } catch {
      callbacks.onError('Unable to connect to chat. Please try again.')
      return
    }
  }

  const token = await user.getIdToken()

  let response: Response
  try {
    response = await fetch(CHAT_URL, {
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
  } catch {
    // Network error (offline, DNS failure, CORS block, etc.)
    callbacks.onError('Unable to connect to chat. Please check your connection and try again.')
    return
  }

  if (!response.ok || !response.body) {
    // Try to extract the server's error message (e.g., rate limit, input too long)
    // so the user sees a specific reason, not a generic failure.
    let errorMsg = 'Failed to connect to chat. Please try again.'
    try {
      const body = await response.json()
      if (body?.error) errorMsg = body.error
    } catch {
      // Response wasn't JSON (e.g., HTML from a misconfigured route), use default
    }
    callbacks.onError(errorMsg)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // Sentinel: tracks whether we received the explicit "done" or "error"
  // event from the backend. If the stream ends without either, the
  // connection was dropped (proxy timeout, network error, backend crash).
  let receivedTerminal = false
  // Idle timer: reset on every chunk. If no data (not even a heartbeat)
  // arrives within READER_TIMEOUT_MS, we abort.
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const clearIdle = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  try {
    while (true) {
      // Start (or restart) the idle timer. If no chunk arrives before it
      // fires, we cancel the reader which causes reader.read() to resolve
      // with { done: true } or throw, breaking the loop.
      clearIdle()
      const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) => {
        idleTimer = setTimeout(() => {
          // Cancel the reader so the read() call resolves/throws
          reader.cancel('timeout')
          resolve({ done: true, value: undefined })
        }, READER_TIMEOUT_MS)
      })

      const result = await Promise.race([reader.read(), timeoutPromise])
      clearIdle()

      if (result.done) {
        // Check if this was a timeout cancellation vs normal stream end
        if (!receivedTerminal) {
          // Could be timeout or premature close. We'll handle below.
        }
        break
      }

      buffer += decoder.decode(result.value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        // SSE comments (": heartbeat") are keepalive signals.
        // They keep the connection alive but carry no data, so skip them.
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
              receivedTerminal = true
              callbacks.onDone(event.messageId)
              break
            case 'error':
              // Server-side error. Mark as terminal so we don't double-error.
              receivedTerminal = true
              callbacks.onError(event.error)
              break
          }
        } catch {
          // Skip malformed JSON events
        }
      }
    }
  } catch {
    // reader.read() threw (network drop, aborted, etc.)
    clearIdle()
    if (!receivedTerminal) {
      callbacks.onError('The connection was lost. Please try again.')
    }
    try { reader.cancel() } catch { /* ignore */ }
    return
  }

  clearIdle()

  // If the stream ended without a "done" or "error" event, the connection
  // was killed (proxy timeout, backend crash, network drop, idle timeout).
  if (!receivedTerminal) {
    callbacks.onError('The response was interrupted. Please try again.')
  }
}
