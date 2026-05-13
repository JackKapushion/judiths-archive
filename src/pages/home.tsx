import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { documents, type SoftaDocument } from '../lib/documents'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import { getUserData, toggleFavorite, isFavorite, type UserData } from '../lib/user-data'

export function Home() {
  const { user } = useAuth()
  const authGate = useAuthGate()
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    if (user) {
      getUserData(user.uid).then(setUserData)
    } else {
      setUserData(null)
    }
  }, [user])

  const handleToggleFavorite = (docId: string) => {
    authGate(async () => {
      if (!user) return
      const nowFav = await toggleFavorite(user.uid, docId)
      setUserData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          favorites: nowFav
            ? [...prev.favorites, docId]
            : prev.favorites.filter((id) => id !== docId),
        }
      })
    })
  }

  // Build recently viewed docs list
  const recentDocs = userData?.recentlyViewed
    ?.map((entry) => documents.find((d) => d.id === entry.docId))
    .filter((d): d is SoftaDocument => d !== undefined)
    .slice(0, 10) ?? []

  // Build favorites list
  const favoriteDocs = userData?.favorites
    ?.map((id) => documents.find((d) => d.id === id))
    .filter((d): d is SoftaDocument => d !== undefined) ?? []

  return (
    <div>
      {recentDocs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isFav={userData ? isFavorite(userData, doc.id) : false}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {favoriteDocs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Favorites</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isFav={true}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-3">All Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isFav={userData ? isFavorite(userData, doc.id) : false}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function DocumentCard({
  doc,
  isFav,
  onToggleFavorite,
}: {
  doc: SoftaDocument
  isFav: boolean
  onToggleFavorite: (docId: string) => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-3 hover:border-gray-300 transition-colors">
      <Link
        to={`/read/${doc.id}`}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <span className="text-lg flex-shrink-0">
          {doc.type === 'pdf' ? '\u{1F4C4}' : '\u{1F5BC}'}
        </span>
        <span className="text-sm text-gray-700 truncate">{doc.title}</span>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault()
          onToggleFavorite(doc.id)
        }}
        className="flex-shrink-0 text-lg hover:scale-110 transition-transform"
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFav ? '\u2764\uFE0F' : '\u2661'}
      </button>
    </div>
  )
}
