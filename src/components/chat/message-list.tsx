import { useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
  streamingText: string | null
  status: string | null
}

export function MessageList({ messages, streamingText, status }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, status])

  if (messages.length === 0 && !streamingText) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-3xl text-[var(--color-foreground)]/80 mb-3">
            Ask about the archive
          </h2>
          <p className="text-[var(--color-foreground)]/45 text-lg leading-relaxed">
            Questions about Judith's writings, teachings, and documents.
            The AI will search the archive and cite its sources.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide relative">
      <div className="sticky top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/90 via-white/60 to-transparent pointer-events-none z-10" />
      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming response */}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div className="max-w-[85%] text-[var(--color-foreground)] text-base leading-relaxed whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-0.5 h-5 bg-[var(--color-primary)] ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {/* Status indicator */}
        {status && (
          <div className="flex items-center gap-2 text-[var(--color-foreground)]/45 text-sm">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {status}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] text-base leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[var(--color-foreground)] text-white rounded-2xl rounded-br-sm px-4 py-2.5'
            : 'text-[var(--color-foreground)]'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
