import { useRef, useState, useEffect, useCallback } from 'react'
import { type SoftaDocument } from '../../lib/documents'
import { DocumentCard } from './document-card'

export function HorizontalSection({
  title,
  description,
  color,
  docs,
  favorites,
  onToggleFavorite,
}: {
  title: string
  description?: string
  color?: string
  docs: SoftaDocument[]
  favorites: Set<string>
  onToggleFavorite: (docId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, docs])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (docs.length === 0) return null

  return (
    <section className="mb-8 relative">
      {color && (
        <div
          className="absolute -inset-x-12 -inset-y-4 -z-1"
          style={{
            backgroundColor: color,
            WebkitMaskImage: 'url(/images/theme/50.png)',
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: 'url(/images/theme/50.png)',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
          }}
        />
      )}
      <div className="relative px-4 py-5">
        <h2 className="text-lg font-medium text-[var(--color-foreground)] mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--color-foreground)]/70 mb-3">{description}</p>
        )}
        <div className="relative group">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/80 shadow border border-[var(--color-foreground)]/10 text-[var(--color-foreground)]/60 hover:bg-white hover:text-[var(--color-foreground)] transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          >
            {docs.map((doc) => (
              <div key={doc.id} className="w-44 flex-shrink-0 snap-start">
                <DocumentCard
                  doc={doc}
                  isFav={favorites.has(doc.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/80 shadow border border-[var(--color-foreground)]/10 text-[var(--color-foreground)]/60 hover:bg-white hover:text-[var(--color-foreground)] transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
