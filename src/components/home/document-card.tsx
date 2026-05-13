import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type SoftaDocument, getThumbnailPath } from '../../lib/documents'

export function DocumentCard({
  doc,
  isFav,
  onToggleFavorite,
}: {
  doc: SoftaDocument
  isFav: boolean
  onToggleFavorite: (docId: string) => void
}) {
  const [imgError, setImgError] = useState(false)
  const thumbnailSrc = getThumbnailPath(doc)

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
      <Link to={`/read/${doc.id}`}>
        <div className="aspect-[3/4] bg-gray-100">
          {imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-gray-400">
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
        </div>
      </Link>
      <div className="p-3 flex items-start justify-between gap-2">
        <Link
          to={`/read/${doc.id}`}
          className="text-sm text-gray-700 leading-tight line-clamp-2 hover:text-gray-900"
        >
          {doc.title}
        </Link>
        <button
          onClick={() => onToggleFavorite(doc.id)}
          className="flex-shrink-0 text-lg hover:scale-110 transition-transform mt-[-2px]"
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFav ? '\u2764\uFE0F' : '\u2661'}
        </button>
      </div>
    </div>
  )
}
