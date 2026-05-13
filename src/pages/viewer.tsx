import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { getDocumentById } from '../lib/documents'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import {
  getUserData,
  toggleFavorite,
  updateProgress,
  addRecentlyViewed,
  isFavorite,
} from '../lib/user-data'

export function Viewer() {
  const { docId } = useParams<{ docId: string }>()
  const doc = docId ? getDocumentById(docId) : undefined
  const { user } = useAuth()
  const authGate = useAuthGate()

  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [isFav, setIsFav] = useState(false)

  // Debounce timer for progress saving
  const progressTimer = useRef<ReturnType<typeof setTimeout>>()

  // Load user data: favorites + reading progress
  useEffect(() => {
    if (!user || !docId) return

    getUserData(user.uid).then((data) => {
      setIsFav(isFavorite(data, docId))

      const progress = data.progress[docId]
      if (progress) {
        setPageNumber(progress.currentPage)
      }
    })

    // Track as recently viewed
    addRecentlyViewed(user.uid, docId)
  }, [user, docId])

  // Save progress when page changes (debounced)
  const saveProgress = useCallback(
    (page: number, total: number) => {
      if (!user || !docId) return
      clearTimeout(progressTimer.current)
      progressTimer.current = setTimeout(() => {
        updateProgress(user.uid, docId, page, total)
      }, 1000)
    },
    [user, docId],
  )

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage)
    saveProgress(newPage, numPages)
  }

  const handleToggleFavorite = () => {
    authGate(async () => {
      if (!user || !docId) return
      const nowFav = await toggleFavorite(user.uid, docId)
      setIsFav(nowFav)
    })
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Document not found</p>
        <Link to="/" className="text-blue-600 hover:underline">Back to home</Link>
      </div>
    )
  }

  const filePath = `/documents/${doc.filename}`

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </Link>
          <h1 className="text-lg font-medium text-gray-900">{doc.title}</h1>
        </div>
        <button
          onClick={handleToggleFavorite}
          className="text-lg hover:scale-110 transition-transform"
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFav ? '\u2764\uFE0F' : '\u2661'}
        </button>
      </div>

      {doc.type === 'image' ? (
        <div className="flex justify-center">
          <img
            src={filePath}
            alt={doc.title}
            className="max-w-full h-auto rounded-lg shadow-sm"
          />
        </div>
      ) : (
        <>
          {/* PDF controls */}
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <button
              onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* PDF document */}
          <div className="flex justify-center overflow-auto">
            <Document
              file={filePath}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="text-center py-12 text-gray-500">Loading PDF...</div>
              }
              error={
                <div className="text-center py-12 text-red-500">Failed to load PDF</div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-lg"
              />
            </Document>
          </div>
        </>
      )}
    </div>
  )
}
