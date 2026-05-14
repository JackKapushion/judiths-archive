import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function SearchInput({
  query,
  onChange,
  compact,
}: {
  query: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? 'w-full relative' : 'max-w-2xl mx-auto relative'}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
        placeholder="Search documents..."
        className={`w-full pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          compact ? 'py-1.5' : 'py-2'
        }`}
      />
    </div>
  )
}

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setHeaderSlot(document.getElementById('header-search-slot'))
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      { rootMargin: '-57px 0px 0px 0px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch(value)
  }

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      {/* Inline version - fades out when stuck */}
      <div
        className={`pb-8 pt-2 px-4 bg-stone-100 transition-opacity duration-150 ${
          isStuck ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-gray-500 text-sm text-center mb-3">
          Scroll down to browse her collected works, or search for something specific.
        </p>
        <SearchInput query={query} onChange={handleChange} />
      </div>
      {/* Header portal version - fades in when stuck */}
      {headerSlot &&
        createPortal(
          <div
            className={`transition-opacity duration-150 ${
              isStuck ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <SearchInput query={query} onChange={handleChange} compact />
          </div>,
          headerSlot
        )}
    </>
  )
}
