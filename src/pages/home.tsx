import { useEffect, useState, useMemo } from 'react'
import { documents, type SoftaDocument, getCategories, getDocumentsByCategory } from '../lib/documents'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import { getUserData, toggleFavorite, type UserData } from '../lib/user-data'
import { Hero } from '../components/home/hero'
import { SearchBar } from '../components/home/search-bar'
import { DocumentCard } from '../components/home/document-card'
import { HorizontalSection } from '../components/home/horizontal-section'

export function Home() {
  const { user } = useAuth()
  const authGate = useAuthGate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [query, setQuery] = useState('')

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

  const favorites = useMemo(
    () => new Set(userData?.favorites ?? []),
    [userData?.favorites]
  )

  const recentDocs = useMemo(
    () =>
      userData?.recentlyViewed
        ?.map((entry) => documents.find((d) => d.id === entry.docId))
        .filter((d): d is SoftaDocument => d !== undefined)
        .slice(0, 5) ?? [],
    [userData?.recentlyViewed]
  )

  const favoriteDocs = useMemo(
    () =>
      userData?.favorites
        ?.map((id) => documents.find((d) => d.id === id))
        .filter((d): d is SoftaDocument => d !== undefined) ?? [],
    [userData?.favorites]
  )

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return documents
    const q = query.toLowerCase()
    return documents.filter((doc) => doc.title.toLowerCase().includes(q))
  }, [query])

  const isSearching = query.trim().length > 0

  return (
    <div>
      <Hero />
      <SearchBar onSearch={setQuery} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {!isSearching && user && favoriteDocs.length > 0 && (
          <HorizontalSection
            title="Favorites"
            color="#DE7880"
            docs={favoriteDocs}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {!isSearching && user && recentDocs.length > 0 && (
          <HorizontalSection
            title="Recently Viewed"
            color="#1E9AAF"
            docs={recentDocs}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {isSearching ? (
          <section>
            <h2 className="text-lg font-medium text-[var(--color-foreground)] mb-3">
              Search Results
            </h2>
            {filteredDocs.length === 0 ? (
              <p className="text-[var(--color-foreground)]/50 text-sm">
                No documents match your search.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    isFav={favorites.has(doc.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          getCategories().map((category) => (
            <HorizontalSection
              key={category.name}
              title={category.name}
              description={category.description}
              color={category.color}
              docs={getDocumentsByCategory(category.name)}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  )
}
