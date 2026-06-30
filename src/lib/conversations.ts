import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

// --- Types ---

export interface Conversation {
  id: string
  userId: string
  title: string
  createdAt: Timestamp
  lastMessageAt: Timestamp
  messageCount: number
  isArchived: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'complete' | 'streaming' | 'error'
  sources?: DocumentSource[]
  createdAt: Timestamp
}

export interface DocumentSource {
  docId: string
  title: string
  snippet: string
}

// SSE event types received from the chat endpoint
export type ChatEvent =
  | { type: 'conversation_created'; conversationId: string }
  | { type: 'status'; text: string }
  | { type: 'content_delta'; text: string }
  | { type: 'sources'; sources: DocumentSource[] }
  | { type: 'title_generated'; title: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; error: string }

// --- Collection references ---

const conversationsRef = collection(db, 'conversations')

function messagesRef(conversationId: string) {
  return collection(db, 'conversations', conversationId, 'messages')
}

// --- Conversation queries ---

export async function getConversations(
  userId: string,
  pageSize = 25,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ conversations: Conversation[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    conversationsRef,
    where('userId', '==', userId),
    where('isArchived', '==', false),
    orderBy('lastMessageAt', 'desc'),
    limit(pageSize),
  )

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snap = await getDocs(q)
  const conversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Conversation)
  const last = snap.docs[snap.docs.length - 1] ?? null

  return { conversations, lastDoc: last }
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(conversationsRef, conversationId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Conversation
}

// --- Message queries ---

export async function getMessages(
  conversationId: string,
  pageSize = 50,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ messages: Message[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    messagesRef(conversationId),
    orderBy('createdAt', 'asc'),
    limit(pageSize),
  )

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snap = await getDocs(q)
  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message)
  const last = snap.docs[snap.docs.length - 1] ?? null

  return { messages, lastDoc: last }
}

// --- Real-time listeners ---

export function onMessagesChange(
  conversationId: string,
  callback: (messages: Message[]) => void,
): Unsubscribe {
  const q = query(messagesRef(conversationId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message)
    callback(messages)
  })
}

// --- Mutations ---

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  await updateDoc(doc(conversationsRef, conversationId), { title })
}

export async function archiveConversation(conversationId: string): Promise<void> {
  await updateDoc(doc(conversationsRef, conversationId), { isArchived: true })
}

export async function deleteConversation(conversationId: string): Promise<void> {
  // Note: Firestore doesn't cascade-delete subcollections.
  // Messages will be orphaned but inaccessible via security rules
  // once the parent conversation doc is gone. For a small app this is fine.
  // A Cloud Function can clean up orphaned messages later if needed.
  await deleteDoc(doc(conversationsRef, conversationId))
}

// --- Sidebar time grouping ---

export type TimeGroup =
  | 'Today'
  | 'Yesterday'
  | 'Previous 7 Days'
  | 'Previous 30 Days'
  | string // month/year like "May 2026"

export function groupConversationsByDate(
  conversations: Conversation[],
): { label: TimeGroup; conversations: Conversation[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000)

  const groups = new Map<string, Conversation[]>()

  for (const convo of conversations) {
    const date = convo.lastMessageAt.toDate()
    let label: string

    if (date >= today) {
      label = 'Today'
    } else if (date >= yesterday) {
      label = 'Yesterday'
    } else if (date >= sevenDaysAgo) {
      label = 'Previous 7 Days'
    } else if (date >= thirtyDaysAgo) {
      label = 'Previous 30 Days'
    } else {
      label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const list = groups.get(label) ?? []
    list.push(convo)
    groups.set(label, list)
  }

  return Array.from(groups.entries()).map(([label, conversations]) => ({
    label,
    conversations,
  }))
}
