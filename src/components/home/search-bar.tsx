import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

function SearchInput({
  query,
  onChange,
  onSubmit,
  inHeader = false,
}: {
  query: string
  onChange: (value: string) => void
  onSubmit: () => void
  inHeader?: boolean
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-foreground)]/40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Search for a title or ask something like "What did she believe about leadership?"'
        className={`w-full pl-10 pr-11 py-2.5 border border-[var(--color-foreground)]/15 rounded-xl text-[var(--color-foreground)] text-base placeholder:text-[var(--color-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/20 shadow-sm ${inHeader ? 'bg-white' : 'bg-white/90'}`}
      />
      <button
        onClick={onSubmit}
        disabled={!query.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[var(--color-foreground)] text-white disabled:opacity-20 hover:bg-[var(--color-foreground)]/80 transition-all cursor-pointer disabled:cursor-default"
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
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </button>
    </div>
  )
}

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const inlineRef = useRef<HTMLDivElement>(null)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  // Track the inline search bar's exact position so the header version matches
  const [inlinePos, setInlinePos] = useState({ left: 0, width: 672 })

  useEffect(() => {
    setHeaderSlot(document.getElementById('header-search-slot'))
  }, [])

  const measureInline = useCallback(() => {
    const el = inlineRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setInlinePos({ left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    measureInline()
    window.addEventListener('resize', measureInline)
    return () => window.removeEventListener('resize', measureInline)
  }, [measureInline])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      { rootMargin: '-65px 0px 0px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const handleSubmit = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/chat?q=${encodeURIComponent(trimmed)}`)
  }

  // Calculate the offset needed to position the header search bar
  // at the same viewport X as the inline version
  const portalStyle = headerSlot
    ? (() => {
        const slotRect = headerSlot.getBoundingClientRect()
        const offset = inlinePos.left - slotRect.left
        return { marginLeft: `${offset}px`, width: `${inlinePos.width}px` }
      })()
    : undefined

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      {/* Inline version - fades out when stuck */}
      <div
        className={`pb-8 pt-2 px-4 transition-opacity duration-150 ${
          isStuck ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-[var(--color-foreground)] text-lg text-center mb-3">
          Scroll down to browse her works, or ask the AI a question here.
        </p>
        <div ref={inlineRef} className="max-w-2xl mx-auto">
          <SearchInput query={query} onChange={setQuery} onSubmit={handleSubmit} />
        </div>
      </div>
      {/* Header portal version - positioned to match inline version exactly */}
      {headerSlot &&
        createPortal(
          <div
            className={`transition-opacity duration-150 ${
              isStuck ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={portalStyle}
          >
            <SearchInput query={query} onChange={setQuery} onSubmit={handleSubmit} inHeader />
          </div>,
          headerSlot
        )}
    </>
  )
}
