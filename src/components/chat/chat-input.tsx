import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  // Lets the parent (Chat page) know when the input is focused,
  // so it can hide the hero text and adjust layout for the keyboard.
  onFocusChange?: (focused: boolean) => void
}

export function ChatInput({ onSend, disabled, placeholder, onFocusChange }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-4 pt-2 pb-5">
      <div className="max-w-2xl mx-auto flex items-center gap-2 bg-white border border-[var(--color-foreground)]/25 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-[var(--color-primary)]/40 focus-within:border-[var(--color-primary)]/30 transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          disabled={disabled}
          rows={1}
          placeholder={placeholder ?? 'Search or ask anything'}
          className="flex-1 resize-none pl-4 py-3 bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-foreground)]/35 focus:outline-none text-base leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 mr-2.5 p-1.5 rounded-xl bg-[var(--color-foreground)] text-white disabled:opacity-20 hover:bg-[var(--color-foreground)]/80 transition-all cursor-pointer disabled:cursor-default"
          aria-label="Send message"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
