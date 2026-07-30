import { useRef, useState, useEffect, useCallback, memo } from 'react'
import { type SoftaDocument } from '../../lib/documents'
import { type ReadingProgress } from '../../lib/user-data'
import { DocumentCard } from './document-card'

// PERFORMANCE: React.memo prevents re-rendering all 8 sections (and their
// ~100 total cards) when Home re-renders from auth state changes. Props are
// stabilized in Home via useMemo (docs, favorites) and useCallback
// (onToggleFavorite), so memo can bail out on shallow comparison.
export const HorizontalSection = memo(function HorizontalSection({
  title,
  description,
  color,
  docs,
  favorites,
  progress,
  onToggleFavorite,
  index = 0,
}: {
  title: string
  description?: string
  color?: string
  docs: SoftaDocument[]
  favorites: Set<string>
  progress?: Record<string, ReadingProgress>
  onToggleFavorite: (docId: string) => void
  index?: number
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
    // 25% on desktop for precise browsing, 50% on mobile where fewer
    // cards are visible and bigger jumps feel more natural
    const step = window.innerWidth >= 640 ? 0.25 : 0.5
    const amount = el.clientWidth * step
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (docs.length === 0) return null

  // MOBILE OVERLAP STACKING: sections have no margin and their painted
  // backgrounds extend vertically (-inset-y-4), creating ~32px of overlap
  // between consecutive sections. z-index decreases with index so each
  // section's feathered bottom edge paints over the next section's top,
  // creating a layered painted-card look with no green gaps.
  // DESKTOP: mb-8 keeps sections spaced apart with green gaps. z-index
  // is harmless since sections don't overlap.
  return (
    <section className="mb-4 sm:mb-8 relative" style={{ zIndex: 20 - index }}>
      {/* DESKTOP: single paint bg with watercolor mask for organic edges
          on all sides. Hidden on mobile where three-div approach is used. */}
      {color && (
        <div
          className="category-paint-bg absolute hidden sm:block sm:-inset-x-12 -inset-y-4 -z-1 pointer-events-none"
          style={{ backgroundColor: color }}
        />
      )}

      {/* MOBILE: three separate DOM elements for consistent feathered
          edges regardless of section height. CSS multi-layer masks can't
          do this because source-over compositing cancels out feathering
          when two masks' opaque centers overlap on short sections.
          Top edge (50px) + solid middle + bottom edge (50px), each
          independently rendered so feathered thickness is always the
          same. -top-4/-bottom-4 extends 16px beyond the section to
          create the 32px overlap zone with adjacent sections. */}
      {color && (
        <>
          <div
            className="splotch-edge-top absolute inset-x-0 -top-4 h-[50px] -z-1 pointer-events-none sm:hidden"
            style={{ backgroundColor: color }}
          />
          <div
            className="absolute inset-x-0 top-[34px] bottom-[34px] -z-1 pointer-events-none sm:hidden"
            style={{ backgroundColor: color }}
          />
          <div
            className="splotch-edge-bottom absolute inset-x-0 -bottom-4 h-[50px] -z-1 pointer-events-none sm:hidden"
            style={{ backgroundColor: color }}
          />
        </>
      )}
      {/* MOBILE: px-0 so the card scroll area reaches the screen edges.
          Title/description get their own px-4 to stay indented from edge.
          Cards get px-4 on the scroll container for alignment with title.
          DESKTOP: px-4 on the wrapper handles all padding uniformly. */}
      {/* py-7 on mobile (vs py-5 desktop) adds extra vertical padding to
          compensate for the removed inter-section margin. The feathered
          paint overlap zone sits in this padding area, keeping content
          comfortably spaced even though the painted backgrounds are
          continuous with no green gaps. */}
      <div className="relative px-0 sm:px-4 py-7 sm:py-5">
        <h2 className="text-xl font-medium text-[var(--color-foreground)] mb-1 px-4 sm:px-0">{title}</h2>
        {description && (
          <p className="text-lg text-[var(--color-foreground)] mb-3 px-4 sm:px-0">{description}</p>
        )}
        <div className="relative">
          {/* Scroll arrows visible on all screen sizes. Mobile uses a
              prominent iOS-style white circle with shadow, inset from screen
              edge. Desktop keeps the same style but flush with content edge. */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="flex absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-full bg-gray-300/90 text-gray-600 active:bg-gray-400/90 hover:text-gray-800 transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* MOBILE: no container padding because padding on overflow-x: auto
              containers isn't reliable across browsers (gets eaten by the
              overflow). Instead, ml-4 on the first card and mr-4 on the last
              card create the indent, matching the title's px-4. */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          >
            {docs.map((doc, i) => {
              const p = progress?.[doc.id]
              // Compute read percentage (0–1) from saved page position.
              // Only pass it when there's meaningful progress (> 0%).
              const readPercent = (p && p.totalPages > 0)
                ? p.currentPage / p.totalPages
                : undefined
              return (
                // MOBILE: ml-4 on first card aligns its left edge with the
                // title text (which has px-4). mr-4 on last card adds matching
                // right-side space. Using margin on flex items instead of
                // padding on the scroll container because padding on
                // overflow-x: auto containers isn't reliable across browsers.
                <div key={doc.id} className={`w-44 flex-shrink-0 snap-start${i === 0 ? ' ml-4 sm:ml-0' : ''}${i === docs.length - 1 ? ' mr-4 sm:mr-0' : ''}`}>
                  <DocumentCard
                    doc={doc}
                    isFav={favorites.has(doc.id)}
                    readPercent={readPercent}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              )
            })}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="flex absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-full bg-gray-300/90 text-gray-600 active:bg-gray-400/90 hover:text-gray-800 transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
})
