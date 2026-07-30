import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

function SearchInput({
  query,
  onChange,
  onSubmit,
  inHeader = false,
  placeholder = 'Search or ask anything',
}: {
  query: string
  onChange: (value: string) => void
  onSubmit: () => void
  inHeader?: boolean
  placeholder?: string
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
        placeholder={placeholder}
        // MOBILE inline: sits on cream splotch, so border is stronger (30%)
        // and bg fully opaque white to stand out against warm cream.
        // DESKTOP inline: no splotch, so reverts to subtle border (15%)
        // and slightly transparent bg (white/90) to let green show through.
        // Header: always subtle border + opaque white.
        className={`w-full pl-10 pr-11 py-2.5 border rounded-xl text-[var(--color-foreground)] text-base placeholder:text-[var(--color-foreground)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/20 shadow-sm ${inHeader ? 'bg-white border-[var(--color-foreground)]/15' : 'bg-white sm:bg-white/90 border-[var(--color-foreground)]/30 sm:border-[var(--color-foreground)]/15'}`}
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

const DESKTOP_PLACEHOLDER =
  'Search for a title or ask a question like, What did Judith believe about leadership?'

// Minimum viewport width for the header search bar. Below this, the header
// doesn't have enough room for "Judith's Archive" + search bar + nav items
// (AI Chat pill, sign-in text) without everything getting smushed together.
// 1024px = Tailwind's lg breakpoint.
const HEADER_SEARCH_MIN_WIDTH = 1024

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const inlineRef = useRef<HTMLDivElement>(null)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  // Track the inline search bar's exact position so the header version matches
  const [inlinePos, setInlinePos] = useState({ left: 0, width: 672 })
  // Short placeholder on mobile, descriptive on desktop (sm = 640px)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 640,
  )

  useEffect(() => {
    setHeaderSlot(document.getElementById('header-search-slot'))
  }, [])

  // Sync placeholder text with viewport width so it updates on resize
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
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
        // Below lg (1024px), the header doesn't have enough room for the
        // search bar alongside the title and nav items. The search bar
        // just scrolls by naturally at narrower widths.
        if (window.innerWidth < HEADER_SEARCH_MIN_WIDTH) {
          setIsStuck(false)
          return
        }

        // During the reverse snap animation (content → hero), the page
        // scrolls past the sentinel. Without this guard, the observer
        // would briefly set isStuck=false, flashing the inline search
        // bar. The data attribute is set by home.tsx during the animation.
        if (document.documentElement.dataset.snapAnimating) return

        if (entry.isIntersecting) {
          setIsStuck(false)
        } else {
          // Show the header search bar when the sentinel scrolls behind
          // the sticky header (top < 65px), but NOT when it's below the
          // viewport (hero is showing, top would be 900+). The 65px
          // matches the header height (h-16 = 64px) + 1px buffer.
          setIsStuck(entry.boundingClientRect.top < 65)
        }
      },
      { rootMargin: '-65px 0px 0px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // When the reverse snap animation lands on the hero, the home component
  // dispatches this event so we remove the search bar from the header.
  useEffect(() => {
    function onSnapToHero() { setIsStuck(false) }
    window.addEventListener('snap-to-hero', onSnapToHero)
    return () => window.removeEventListener('snap-to-hero', onSnapToHero)
  }, [])

  // Keep isStuck in sync with viewport width on resize. If someone scrolls
  // down at full width (isStuck=true) then shrinks the window, we need to
  // hide the header search bar. If they resize back wider, we re-check
  // whether the sentinel is behind the header and restore isStuck.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < HEADER_SEARCH_MIN_WIDTH) {
        setIsStuck(false)
      } else {
        const sentinel = sentinelRef.current
        if (sentinel) {
          const top = sentinel.getBoundingClientRect().top
          // 65px matches the header height (h-16 = 64px) + 1px buffer,
          // same threshold as the IntersectionObserver above
          setIsStuck(top < 65)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSubmit = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    // Blur the input to dismiss the iOS keyboard before navigating.
    // Without this, the visual viewport offset from the open keyboard
    // persists into the chat page, causing the header to be clipped.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    window.scrollTo(0, 0)
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
      {/* Search splotch wrapper. Uses the same layout pattern as category
          sections (HorizontalSection) so spacing between all splotches is
          identical. mb-0 + the paint bg's -inset-y-4 creates a 32px overlap
          zone with the first category section below (16px from each side). */}
      <div
        className={`relative mb-4 sm:mb-0 transition-opacity duration-150 ${
          isStuck ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: 21 }}
      >
        {/* MOBILE splotch: three separate DOM elements for consistent
            feathered edges. Same technique as category sections. */}
        <div
          className="splotch-edge-top absolute inset-x-0 -top-4 h-[50px] -z-1 pointer-events-none sm:hidden"
          style={{ backgroundColor: '#F5F0E8' }}
        />
        <div
          className="absolute inset-x-0 top-[34px] bottom-[34px] -z-1 pointer-events-none sm:hidden"
          style={{ backgroundColor: '#F5F0E8' }}
        />
        <div
          className="splotch-edge-bottom absolute inset-x-0 -bottom-4 h-[50px] -z-1 pointer-events-none sm:hidden"
          style={{ backgroundColor: '#F5F0E8' }}
        />
        {/* py-7 on mobile matches category section padding (py-7) for
            consistent vertical rhythm across all splotches.
            sm:pt-2 sm:pb-8 for desktop (no splotch, green background). */}
        <div className="relative py-7 sm:pt-2 sm:pb-8 px-4">
          {/* Left-aligned on mobile for readability, centered on desktop */}
          <p className="text-[var(--color-foreground)] text-xl font-medium text-left sm:text-center mb-3">
            Scroll down to browse her works, or ask the AI a question here.
          </p>
          <div ref={inlineRef} className="max-w-2xl mx-auto">
            <SearchInput
              query={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              placeholder={isDesktop ? DESKTOP_PLACEHOLDER : 'Search or ask anything'}
            />
          </div>
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
            <SearchInput query={query} onChange={setQuery} onSubmit={handleSubmit} inHeader placeholder={DESKTOP_PLACEHOLDER} />
          </div>,
          headerSlot
        )}
    </>
  )
}
