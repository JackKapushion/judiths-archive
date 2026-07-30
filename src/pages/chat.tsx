import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/auth/auth-context'
import { ChatSidebar } from '../components/chat/chat-sidebar'
import { MessageList, type ChatMessage } from '../components/chat/message-list'
import { ChatInput } from '../components/chat/chat-input'
import { sendChatMessage } from '../lib/chat-client'
import { onMessagesChange, onConversationDoc } from '../lib/conversations'

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
  // True when the backend is generating a response but we're not
  // actively streaming via SSE (e.g., the user navigated away and
  // came back). Drives the typing indicator in MessageList.
  const [isGenerating, setIsGenerating] = useState(false)
  // Driven by focus/blur on the textarea. When the user taps the
  // input, the hero hides immediately. On keyboard dismiss (auto-blur
  // below), inputFocused flips back to false and the hero returns.
  const [inputFocused, setInputFocused] = useState(false)
  const initialQuerySent = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Blocks the Firestore real-time listener from overwriting local
  // state while SSE is actively streaming. Without this guard, the
  // listener would fire when the backend writes the user message to
  // Firestore and replace the optimistic local state (with different
  // IDs), causing React to remount message bubbles mid-stream.
  const isStreamingRef = useRef(false)
  // Tracks whether the keyboard was open on the previous viewport
  // change, so we can detect the close transition and auto-blur.
  const wasKeyboardOpenRef = useRef(false)

  // LAYOUT APPROACH: position:fixed container (same as the viewer page).
  //
  // The container uses position:fixed with top/bottom/left/right so it's
  // completely independent of the body's scroll state. This fixes the bug
  // where navigating from the home page (scrolled down to the search bar)
  // caused the chat page to inherit that scroll offset, clipping the header.
  //
  // The interactive-widget=resizes-content meta tag makes the CSS viewport
  // resize when the keyboard opens, so fixed+bottom:0 naturally adapts
  // without needing JS height calculations.
  useLayoutEffect(() => {
    // Prevent body scroll and overscroll so iOS rubber-band doesn't
    // push the header behind the Safari chrome.
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overscrollBehavior = 'none'
    // Match the chat container's flat background. Must also clear
    // the body's background-image (paper texture) and blend mode,
    // because textured #e2e8d4 + soft-light renders a different
    // shade than flat #e2e8d4, creating a visible two-tone effect
    // wherever the body peeks through (below container, gaps, etc.).
    document.body.style.backgroundColor = '#e2e8d4'
    document.body.style.backgroundImage = 'none'

    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.overscrollBehavior = ''
      document.body.style.overscrollBehavior = ''
      document.body.style.backgroundColor = ''
      document.body.style.backgroundImage = ''
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)

    const vv = window.visualViewport

    // Detect keyboard close to auto-blur empty textarea (so the
    // hero text returns) and reset any iOS visual viewport drift.
    const checkKeyboardAndBlur = () => {
      if (!vv) return
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height)
      const isOpen = keyboardHeight > 100
      if (wasKeyboardOpenRef.current && !isOpen) {
        window.scrollTo(0, 0)
        if (
          document.activeElement instanceof HTMLTextAreaElement &&
          !document.activeElement.value.trim()
        ) {
          document.activeElement.blur()
        }
      }
      wasKeyboardOpenRef.current = isOpen
    }

    // Reposition the fixed container so the chat input sits above
    // the keyboard on iOS Safari. Safari doesn't support the
    // interactive-widget=resizes-content meta tag (Chrome-only), so
    // position:fixed bottom:0 lands behind the keyboard. We use the
    // visualViewport API to calculate how much of the layout viewport
    // is hidden behind the keyboard + Safari's toolbar and offset
    // the container's bottom edge by that amount.
    const adjustForKeyboard = () => {
      if (!vv || !containerRef.current) return
      const offset = window.innerHeight - vv.height - vv.offsetTop
      containerRef.current.style.bottom = `${Math.max(0, offset)}px`
    }

    const handleViewportChange = () => {
      // Only respond to viewport changes caused by the chat input.
      // When the sidebar rename input (or any other external input)
      // is focused, ignore the resize to avoid mixing two screens.
      const activeEl = document.activeElement
      const isExternalFocus = activeEl
        && activeEl !== document.body
        && !containerRef.current?.contains(activeEl)
      if (isExternalFocus) return

      adjustForKeyboard()
      checkKeyboardAndBlur()
      // Delayed re-check: when iOS dismisses the keyboard, the
      // keyboard animation and URL bar transition happen
      // simultaneously. By 400ms everything has settled to the
      // true resting values, so the keyboard-close transition
      // is reliably detected.
      setTimeout(() => {
        adjustForKeyboard()
        checkKeyboardAndBlur()
      }, 400)
    }

    const preventScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }

    if (vv) {
      vv.addEventListener('resize', handleViewportChange)
      vv.addEventListener('scroll', handleViewportChange)
    }
    window.addEventListener('scroll', preventScroll)

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange)
        vv.removeEventListener('scroll', handleViewportChange)
      }
      window.removeEventListener('scroll', preventScroll)
    }
  }, [])

  // Real-time message listener. Replaces the old one-time getMessages fetch
  // so that when the user navigates away mid-generation and comes back,
  // new messages from the backend appear automatically as they're written
  // to Firestore. The isStreamingRef guard prevents the listener from
  // overwriting local optimistic state during active SSE streaming.
  useEffect(() => {
    const convoId = conversationId ?? null
    setCurrentConvoId(convoId)

    if (!convoId) {
      setMessages([])
      setIsGenerating(false)
      return
    }

    // Listen for message changes in real-time
    const unsubMessages = onMessagesChange(convoId, (firestoreMessages) => {
      // Don't overwrite local state during active SSE streaming.
      // The SSE callbacks handle display during active chatting.
      if (isStreamingRef.current) return

      const chatMessages: ChatMessage[] = firestoreMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))

      // Restore error from sessionStorage if the last send failed.
      // This keeps the error visible after a page refresh.
      const storedError = sessionStorage.getItem(`chat-error-${convoId}`)
      if (storedError) {
        try {
          const { userMessage, error } = JSON.parse(storedError)
          if (userMessage) {
            chatMessages.push({ id: `retry-user-${Date.now()}`, role: 'user', content: userMessage })
          }
          chatMessages.push({ id: `retry-error-${Date.now()}`, role: 'assistant', content: error, isError: true })
        } catch {
          // Malformed stored data, ignore
        }
      }

      setMessages(chatMessages)
    })

    // Listen for conversation doc changes (specifically the 'generating'
    // status). When the user navigates back to a conversation that's
    // mid-generation, this shows a typing indicator until the response
    // is written to Firestore and the message listener picks it up.
    const unsubConvo = onConversationDoc(convoId, (convo) => {
      if (!convo) return
      // Only show the generating indicator when we're NOT actively
      // streaming via SSE (which has its own typing indicator).
      setIsGenerating(!isStreamingRef.current && convo.status === 'generating')
    })

    return () => {
      unsubMessages()
      unsubConvo()
    }
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
      isStreamingRef.current = true
      // Clear the background generating indicator since SSE takes
      // over with its own streaming UI.
      setIsGenerating(false)

      let accumulatedText = ''
      // Track the conversation ID for this request so we can store
      // errors against the right key (it may change mid-request if
      // a new conversation is created).
      let errorConvoId = currentConvoId

      try {
        await sendChatMessage(message, currentConvoId, {
          onConversationCreated: (id) => {
            errorConvoId = id
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
            // Unblock the Firestore listener so it can take over for
            // future updates (e.g., if the user navigates away and back).
            isStreamingRef.current = false
            // Clear any stored error for this conversation since the send succeeded
            if (errorConvoId) {
              sessionStorage.removeItem(`chat-error-${errorConvoId}`)
            }
          },
          onError: (error) => {
            // Preserve any partial text the user was already reading
            // instead of wiping it when an error occurs mid-stream.
            if (accumulatedText) {
              setMessages((prev) => [
                ...prev,
                { id: `partial-${Date.now()}`, role: 'assistant', content: accumulatedText },
              ])
            }
            setStreamingText(null)
            setStatus(null)
            setIsStreaming(false)
            isStreamingRef.current = false
            // Show error as a visually distinct system message
            setMessages((prev) => [
              ...prev,
              { id: `error-${Date.now()}`, role: 'assistant', content: error, isError: true },
            ])
            // Persist to sessionStorage so the error survives page refresh
            if (errorConvoId) {
              sessionStorage.setItem(
                `chat-error-${errorConvoId}`,
                JSON.stringify({ userMessage: message, error }),
              )
            }
          },
        })
      } catch {
        // Catch-all: if sendChatMessage throws an unhandled error (shouldn't
        // happen, but prevents the UI from freezing if it does).
        if (accumulatedText) {
          setMessages((prev) => [
            ...prev,
            { id: `partial-${Date.now()}`, role: 'assistant', content: accumulatedText },
          ])
        }
        setStreamingText(null)
        setStatus(null)
        setIsStreaming(false)
        isStreamingRef.current = false
        setMessages((prev) => [
          ...prev,
          { id: `error-${Date.now()}`, role: 'assistant', content: 'Something went wrong. Please try again.', isError: true },
        ])
      }
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

  // position:fixed so the container is immune to body scroll state.
  // top uses --header-height (set by Header's ResizeObserver) so it
  // sits right below the sticky header. bottom:0 fills the rest of
  // the viewport. interactive-widget=resizes-content in the meta tag
  // makes the CSS viewport shrink when the keyboard opens, so the
  // fixed container naturally adapts without JS height calculations.
  return (
    <div ref={containerRef} className="fixed inset-x-0 bottom-0 flex overflow-hidden" style={{ top: 'var(--header-height, 64px)' }}>
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentConversationId={currentConvoId}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#e2e8d4]">
        {/* Mobile sidebar toggle - bolder icon for easy tap target */}
        <div className="lg:hidden flex items-center px-3 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-foreground)]/5 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        {/* Chat content area: the input floats over the messages
            with gradient fades so text scrolls behind the input and
            fades out smoothly (like ChatGPT) instead of hard-clipping
            at the input box edge. */}
        <div className="relative flex-1 min-h-0">
          {/* Messages fill the full height. Bottom padding on the
              inner content ensures the last message can scroll above
              the input overlay. */}
          <div className="absolute inset-0 flex flex-col">
            <MessageList
              messages={messages}
              streamingText={streamingText}
              status={status}
              inputFocused={inputFocused}
              isGenerating={isGenerating}
            />
          </div>

          {/* Top fade: text fades as it scrolls to the top edge */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#e2e8d4] to-transparent z-10" />

          {/* Bottom: gradient fade into the input. Messages scroll
              behind and fade out through the gradient. */}
          <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
            <div className="h-8 bg-gradient-to-b from-transparent to-[#e2e8d4]" />
            <div className="bg-[#e2e8d4] pointer-events-auto">
              <ChatInput
                onSend={handleSend}
                disabled={isStreaming}
                placeholder="Search or ask anything"
                onFocusChange={setInputFocused}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
