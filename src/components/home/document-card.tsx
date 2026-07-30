import { useState, memo } from 'react'
import { Link } from 'react-router-dom'
import { type SoftaDocument, getThumbnailPath } from '../../lib/documents'
import { getPageCount } from '../../lib/document-outlines'

// PERFORMANCE: React.memo prevents re-rendering ~100 cards when unrelated
// state changes (auth loading, modal toggle, etc.). Cards only re-render
// when their own doc, isFav, or onToggleFavorite actually change.
//
// HOVER: Uses CSS group-hover (not JS onMouseEnter/onMouseLeave). CSS hover
// is handled by the browser's rendering engine, independent of the JS main
// thread. This means hover works even during React re-renders. JS-based
// hover was tried and failed because any main thread work (re-renders,
// Firebase SDK init) blocks JS event handlers.
export const DocumentCard = memo(function DocumentCard({
  doc,
  isFav,
  readPercent,
  onToggleFavorite,
}: {
  doc: SoftaDocument
  isFav: boolean
  readPercent?: number
  onToggleFavorite: (docId: string) => void
}) {
  const [imgError, setImgError] = useState(false)
  const thumbnailSrc = getThumbnailPath(doc)
  const pageCount = getPageCount(doc.id)

  return (
    <div className="bg-white/80 rounded-lg border border-[var(--color-foreground)]/10 overflow-hidden hover:border-[var(--color-foreground)]/20 hover:shadow-sm transition-all">
      <Link to={`/read/${doc.id}`} className="group block">
        <div className="relative aspect-[3/4] bg-[var(--color-tertiary)]/30">
          {imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-[var(--color-foreground)]/40">
              <svg
                className="w-10 h-10 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span className="text-xs text-center leading-tight">
                {doc.title}
              </span>
            </div>
          ) : (
            <img
              src={thumbnailSrc}
              alt={doc.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col items-center justify-center p-4">
            <p className="text-white text-sm text-center leading-snug">
              {doc.title}
            </p>
            {pageCount != null && (
              <p className="text-white/60 text-sm mt-2">
                {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </p>
            )}
            {/* Reading progress bar. Follows the Kindle/BookOrbit pattern:
                thin bar at the bottom of the cover, only shown when there's
                actual reading progress. Positioned absolute so it sits at
                the bottom edge regardless of the centered text layout above. */}
            {readPercent != null && readPercent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full"
                      style={{ width: `${Math.round(readPercent * 100)}%` }}
                    />
                  </div>
                  <span className="text-white/60 text-sm tabular-nums flex-shrink-0">
                    {Math.round(readPercent * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="p-3 flex items-start justify-between gap-2">
        <Link
          to={`/read/${doc.id}`}
          className="text-sm text-[var(--color-foreground)] leading-tight line-clamp-2 hover:opacity-70"
        >
          {doc.title}
        </Link>
        <button
          onClick={() => onToggleFavorite(doc.id)}
          className={`flex-shrink-0 transition-all duration-150 mt-[-2px] hover:scale-110 ${
            isFav
              ? 'text-red-500'
              : 'text-[var(--color-foreground)]/25 hover:text-red-400'
          }`}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFav ? 0 : 2} fill={isFav ? 'currentColor' : 'none'}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>
    </div>
  )
})
