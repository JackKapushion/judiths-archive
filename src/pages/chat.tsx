import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/auth/auth-context'
import { ChatSidebar } from '../components/chat/chat-sidebar'
import { MessageList, type ChatMessage } from '../components/chat/message-list'
import { ChatInput } from '../components/chat/chat-input'
import { sendChatMessage } from '../lib/chat-client'
import { getMessages } from '../lib/conversations'
import { isDemoConversation, DEMO_MESSAGES } from '../lib/demo-data'

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(
    conversationId ?? null,
  )
  const initialQuerySent = useRef(false)

  // Load messages when navigating to an existing conversation
  useEffect(() => {
    const convoId = conversationId ?? null
    setCurrentConvoId(convoId)

    if (!convoId) {
      setMessages([])
      return
    }

    // Demo conversations use hardcoded messages
    if (isDemoConversation(convoId)) {
      setMessages(DEMO_MESSAGES[convoId] ?? [])
      return
    }

    getMessages(convoId).then(({ messages }) => {
      setMessages(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      )
    })
  }, [conversationId])

  const handleSend = useCallback(
    async (message: string) => {
      if (isStreaming) return

      // Add user message to UI immediately
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
      }
      setMessages((prev) => [...prev, userMsg])
      setStreamingText('')
      setStatus(null)
      setIsStreaming(true)

      let accumulatedText = ''

      await sendChatMessage(message, currentConvoId, {
        onConversationCreated: (id) => {
          setCurrentConvoId(id)
          if (user && !user.isAnonymous) {
            navigate(`/chat/${id}`, { replace: true })
          }
        },
        onStatus: (text) => {
          setStatus(text)
        },
        onContentDelta: (text) => {
          setStatus(null)
          accumulatedText += text
          setStreamingText(accumulatedText)
        },
        onDone: (messageId) => {
          // Move streaming text into messages list
          setMessages((prev) => [
            ...prev,
            { id: messageId, role: 'assistant', content: accumulatedText },
          ])
          setStreamingText(null)
          setStatus(null)
          setIsStreaming(false)
        },
        onError: (error) => {
          setStreamingText(null)
          setStatus(null)
          setIsStreaming(false)
          // Show error as a system message
          setMessages((prev) => [
            ...prev,
            { id: `error-${Date.now()}`, role: 'assistant', content: error },
          ])
        },
      })
    },
    [user, isStreaming, currentConvoId, navigate],
  )

  // Auto-send query from ?q= parameter (from home page search bar)
  useEffect(() => {
    const q = searchParams.get('q')
    if (!q || initialQuerySent.current) return

    initialQuerySent.current = true
    setSearchParams({}, { replace: true })
    handleSend(q)
  }, [searchParams, handleSend, setSearchParams])

  return (
    <div className="flex overflow-x-clip" style={{ height: 'calc(100vh - 64px)' }}>
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentConversationId={currentConvoId}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-white/90">
        {/* Mobile sidebar toggle */}
        <div className="lg:hidden flex items-center px-3 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[var(--color-foreground)]/50 hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        <MessageList
          messages={messages}
          streamingText={streamingText}
          status={status}
        />

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
