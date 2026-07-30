import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { parseCitations, type Citation } from '../../lib/citation-parser'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Marks system-generated error messages (timeouts, connection drops, etc.)
  // so they render with distinct styling instead of looking like a real response.
  isError?: boolean
}

interface MessageListProps {
  messages: ChatMessage[]
  streamingText: string | null
  status: string | null
  // Driven by focus/blur on the input textarea. When the user taps
  // the input, the hero text hides immediately (no waiting for
  // keyboard detection). Works identically on mobile and desktop.
  inputFocused?: boolean
  // True when the backend is generating a response but we're not
  // streaming via SSE (user navigated away and came back). Shows
  // a typing indicator until the Firestore listener picks up the
  // completed response.
  isGenerating?: boolean
}

export function MessageList({ messages, streamingText, status, inputFocused, isGenerating }: MessageListProps) {
  // Ref on the scroll container itself (not a bottom marker).
  // Using scrollTo on the container instead of scrollIntoView on a
  // child, because scrollIntoView walks up ALL scrollable ancestors
  // and can shift the body/visual viewport on iOS, pushing the
  // sticky header behind the Safari chrome during streaming.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Track scroll position to show/hide the scroll-to-bottom button.
  // The button appears when the user scrolls up more than 100px from
  // the bottom, matching the pattern in ChatGPT and Claude.
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  // Track message count so we can detect when a new message is
  // added (user sends or assistant response completes) vs.
  // streaming updates to an in-progress response.
  const prevMessageCountRef = useRef(messages.length)

  // Auto-scroll logic: always scroll to bottom when a new message
  // is added (user just sent something, or assistant reply finished).
  // During streaming, only scroll if the user is already near the
  // bottom, so reading earlier messages isn't interrupted.
  useEffect(() => {
    if (!scrollRef.current) return

    const messageCountChanged = messages.length !== prevMessageCountRef.current
    prevMessageCountRef.current = messages.length

    if (messageCountChanged) {
      // New message added: always scroll to bottom. Use rAF so
      // React has flushed the new DOM content before we measure
      // scrollHeight, otherwise we'd scroll to the old position.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
      return
    }

    // Streaming update: only auto-scroll if already near bottom.
    // Uses 'instant' (not 'smooth') so there's no animation fighting
    // the user's scroll. With 'smooth', each token triggers a new
    // animation that pulls the user back down before they can escape
    // the 100px threshold.
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    if (isNearBottom) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'instant',
      })
    }
  }, [messages, streamingText, status, isGenerating])

  if (messages.length === 0 && !streamingText) {
    // Hero visibility has different rules on mobile vs desktop:
    //
    // MOBILE (<640px): Hide the hero as soon as the input is focused.
    // The on-screen keyboard takes ~half the viewport, so there's not
    // enough room for both the hero text and the input. Hiding the
    // hero immediately frees vertical space. When the keyboard is
    // dismissed (auto-blur fires), inputFocused flips back to false
    // and the hero returns.
    //
    // DESKTOP (>=640px): Keep the hero visible even when the input is
    // focused, because there's no keyboard stealing screen space. The
    // hero only disappears once the first message is sent (at which
    // point messages.length > 0 and this entire block is skipped).
    const isMobile = typeof window !== 'undefined'
      && !window.matchMedia('(min-width: 640px)').matches
    const shouldHideHero = isMobile && inputFocused

    if (shouldHideHero) {
      // Swap to a plain spacer so the input sits at the bottom of
      // the visible area above the keyboard. onClick blurs the
      // textarea explicitly because iOS doesn't always blur inputs
      // when tapping non-interactive empty divs.
      return (
        <div
          className="flex-1"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur()
            }
          }}
        />
      )
    }
    return (
      // pb-28 accounts for the input overlay height (gradient + input
      // + bottom padding ≈ 104px) so the hero centers in the visible
      // area above the input, not behind it.
      <div className="flex-1 flex items-center justify-center p-8 pb-28">
        <div className="text-center max-w-lg">
          <h2 className="text-3xl text-[var(--color-foreground)]/80 mb-3">
            Ask about the archive
          </h2>
          <p className="text-[var(--color-foreground)]/45 text-lg leading-relaxed">
            Questions about Judith's writings, teachings, and documents.
            The AI will search the archive and cite its sources.
          </p>
          <p className="text-[var(--color-foreground)]/30 text-sm mt-3">
            Curious how this works?{' '}
            <a
              href="https://github.com/JackKapushion/judiths-archive/blob/main/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-foreground)]/50 transition-colors"
            >
              Check this out
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto scrollbar-hide">
        {/* pb-28 provides clearance so the last message can scroll
            fully above the input overlay (gradient + input ≈ 104px). */}
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-28 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming response: show partial text as it arrives */}
        {streamingText !== null && streamingText !== '' && (
          <div className="flex justify-start">
            <div className="text-[var(--color-foreground)] text-base leading-relaxed">
              <MarkdownContent content={streamingText} />
            </div>
          </div>
        )}

        {/* Loading indicator: visible during SSE streaming (streamingText !== null)
            or when the backend is generating in the background (isGenerating).
            The background case happens when the user navigated away mid-generation
            and came back. The Firestore listener will pick up the completed
            response, but until then we show pulsing dots. */}
        {(streamingText !== null || isGenerating) && (
          <div className="flex items-center gap-3 text-[var(--color-foreground)]/50 text-sm">
            <TypingIndicator />
            {status && <span>{status}</span>}
            {isGenerating && !status && <span>Generating response...</span>}
          </div>
        )}

        {/* No bottom marker needed. Auto-scroll uses scrollTo on
            the container ref (scrollRef) instead of scrollIntoView
            on a child element, to avoid shifting the body. */}
      </div>
    </div>

      {/* Scroll-to-bottom button: appears when the user scrolls up,
          positioned right above the input overlay. Same pattern as
          ChatGPT and Claude. */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-white border border-[var(--color-foreground)]/15 shadow-md flex items-center justify-center text-[var(--color-foreground)]/60 hover:text-[var(--color-foreground)] transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}

// --- Typing indicator (three pulsing dots) ---

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-2 h-2 rounded-full bg-[var(--color-foreground)]/40"
          style={{
            animation: 'dot-pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

// --- Citation link ---

// Renders as a compact page reference link. The document title should
// already appear in the surrounding prose (per the system prompt), so
// the link only shows the page number. Full title is in the tooltip.
// Opens in a new tab so the user doesn't lose their chat conversation.
function CitationLink({ citation }: { citation: Citation }) {
  const pageParam = citation.endPage
    ? `${citation.page}-${citation.endPage}`
    : `${citation.page}`
  const pageLabel = citation.endPage
    ? `pp. ${citation.page}-${citation.endPage}`
    : `p. ${citation.page}`

  const url = `/read/${citation.docId}?page=${pageParam}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      // Explicit onClick with window.open as a workaround for Chrome mobile,
      // where tapping <a target="_blank"> inside a scrollable container
      // sometimes does nothing (the native link behavior silently fails).
      // Safari handles it natively, but window.open from a click handler
      // works reliably on both.
      onClick={(e) => {
        e.preventDefault()
        window.open(url, '_blank')
      }}
      className="inline text-[var(--color-primary)] hover:underline text-sm"
      title={`${citation.title}, ${pageLabel}`}
    >
      ({pageLabel})
    </a>
  )
}

// --- Markdown rendering with citation support ---

/**
 * Processes React children to find string nodes and replace citation
 * patterns ([Title, p. X]) with clickable CitationLink components.
 * Non-string children (like nested elements) pass through unchanged.
 */
function withCitations(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string') return child

    const parts = parseCitations(child)
    // If no citations found, return the string unchanged
    if (parts.length === 1 && typeof parts[0] === 'string') return child

    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return <span key={i}>{part}</span>
      }
      return <CitationLink key={i} citation={part} />
    })
  })
}

// Markdown rendering for chat responses.
//
// Visual hierarchy for distinguishing content types:
//   *italic*          = document title (e.g., *Natural Leadership*)
//   "quotes" + (p. X) = Judith's direct words, with citation link
//   plain text         = the model's own commentary
//
// Headers render as bold paragraphs (not oversized) and blockquotes
// render as plain text, so the conversational flow isn't broken even
// if the model generates markdown structure.
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{withCitations(children)}</p>,
  strong: ({ children }) => <strong className="font-semibold">{withCitations(children)}</strong>,
  // Italic is used for document titles (e.g., *Natural Leadership*).
  // Quotes from the archive use quotation marks, not italics.
  em: ({ children }) => <em className="italic">{withCitations(children)}</em>,
  // Headers render as regular bold text, not oversized section headers.
  // The model should write flowing paragraphs, but if it generates a
  // header it won't visually break the conversational flow.
  h1: ({ children }) => <p className="font-semibold mb-3 last:mb-0">{withCitations(children)}</p>,
  h2: ({ children }) => <p className="font-semibold mb-3 last:mb-0">{withCitations(children)}</p>,
  h3: ({ children }) => <p className="font-semibold mb-3 last:mb-0">{withCitations(children)}</p>,
  // Blockquotes render as regular paragraphs. Quotes belong inline
  // with quotation marks, not in styled quote blocks.
  blockquote: ({ children }) => <div className="mb-3 last:mb-0">{children}</div>,
  li: ({ children }) => <li>{withCitations(children)}</li>,
  ul: ({ children }) => <ul className="mb-3 last:mb-0 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 last:mb-0 ml-5 list-decimal space-y-1">{children}</ol>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return <code className={`block bg-black/5 rounded-lg p-3 text-sm mb-3 overflow-x-auto ${className}`}>{children}</code>
    }
    return <code className="bg-black/5 rounded px-1.5 py-0.5 text-sm">{children}</code>
  },
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown components={markdownComponents}>
      {content}
    </ReactMarkdown>
  )
}

// --- Message bubble ---

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  // Error messages get muted styling so they're clearly not part of the
  // conversation. Warm amber tone stands out against the sage background
  // without looking alarming.
  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="text-sm text-amber-800/70 leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  // User messages: right-aligned bubble capped at 85% width.
  // Assistant messages: full-width left-aligned text (like Claude.ai),
  // no max-width constraint so text flows edge-to-edge in the
  // content area.
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`text-base leading-relaxed ${
          isUser
            ? 'max-w-[85%] bg-[var(--color-foreground)] text-white rounded-2xl rounded-br-sm px-4 py-2.5 whitespace-pre-wrap'
            : 'text-[var(--color-foreground)]'
        }`}
      >
        {isUser ? message.content : <MarkdownContent content={message.content} />}
      </div>
    </div>
  )
}
