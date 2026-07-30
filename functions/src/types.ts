import { Timestamp } from 'firebase-admin/firestore'

// Firestore: /conversations/{conversationId}
export interface Conversation {
  userId: string
  title: string
  createdAt: Timestamp
  lastMessageAt: Timestamp
  messageCount: number
  isArchived: boolean
  summary?: string
  // Tracks whether the backend is actively generating a response.
  // Set to 'generating' before the AI loop starts, cleared to 'idle'
  // when done (or on error). The frontend uses this to show a typing
  // indicator when the user navigates back to a mid-generation conversation.
  status?: 'generating' | 'idle'
}

// Firestore: /conversations/{conversationId}/messages/{messageId}
export interface Message {
  role: 'user' | 'assistant'
  content: string
  status: 'complete' | 'streaming' | 'error'
  sources?: DocumentSource[]
  createdAt: Timestamp
}

// A citation back to a specific document in the archive
export interface DocumentSource {
  docId: string
  title: string
  snippet: string
}

// POST body for the chat endpoint
export interface ChatRequest {
  conversationId?: string // omit to create a new conversation
  message: string
}

// SSE event types sent during streaming
export type ChatEvent =
  | { type: 'conversation_created'; conversationId: string }
  | { type: 'status'; text: string }
  | { type: 'content_delta'; text: string }
  | { type: 'sources'; sources: DocumentSource[] }
  | { type: 'title_generated'; title: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; error: string }
