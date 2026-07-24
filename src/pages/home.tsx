import { useEffect, useState, useMemo, useCallback } from 'react'
import { documents, type SoftaDocument, getCategories, getDocumentsByCategory } from '../lib/documents'
import { useAuth } from '../components/auth/auth-context'
import { useAuthGate } from '../components/auth/use-auth-gate'
import { getUserData, toggleFavorite, type UserData } from '../lib/user-data'
import { Hero } from '../components/home/hero'
import { SearchBar } from '../components/home/search-bar'
import { HorizontalSection } from '../components/home/horizontal-section'

const defaultUserData: UserData = { favorites: [], progress: {}, recentlyViewed: [] }

export function Home() {
  const { user } = useAuth()
  const authGate = useAuthGate()
  const [userData, setUserData] = useState<UserData | null>(null)

  const isRealUser = user && !user.isAnonymous

  useEffect(() => {
    if (isRealUser) {
      getUserData(user.uid).then(setUserData).catch((err) => {
        console.error('Failed to load user data:', err)
      })
    } else {
      setUserData(null)
    }
  }, [isRealUser, user])

  // useCallback so this is a stable reference. Without it, every Home render
  // creates a new function, which defeats React.memo on HorizontalSection
  // and DocumentCard (they'd see a new onToggleFavorite prop every time).
  const handleToggleFavorite = useCallback(
    (docId: string) => {
      authGate(async () => {
        if (!user) return
        try {
          const nowFav = await toggleFavorite(user.uid, docId)
          setUserData((prev) => {
            const base = prev ?? defaultUserData
            return {
              ...base,
              favorites: nowFav
                ? [...base.favorites, docId]
                : base.favorites.filter((id) => id !== docId),
            }
          })
        } catch (err) {
          console.error('Failed to toggle favorite:', err)
        }
      })
    },
    [authGate, user]
  )

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

  // Documents are static (hardcoded array), so categories and their filtered
  // doc lists never change. Memoizing with [] deps computes them once.
  // Without this, getDocumentsByCategory() returns a new array every render,
  // which breaks React.memo on HorizontalSection (new docs reference = re-render).
  const categories = useMemo(() => getCategories(), [])
  const categoryDocs = useMemo(() => {
    const map = new Map<string, SoftaDocument[]>()
    for (const cat of categories) {
      map.set(cat.name, getDocumentsByCategory(cat.name))
    }
    return map
  }, [categories])

  return (
    <div>
      <Hero />
      <SearchBar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {isRealUser && favoriteDocs.length > 0 && (
          <HorizontalSection
            title="Favorites"
            color="#DE7880"
            docs={favoriteDocs}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {isRealUser && recentDocs.length > 0 && (
          <HorizontalSection
            title="Recently Viewed"
            color="#1E9AAF"
            docs={recentDocs}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {categories.map((category) => (
          <HorizontalSection
            key={category.name}
            title={category.name}
            description={category.description}
            color={category.color}
            docs={categoryDocs.get(category.name)!}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  )
}
