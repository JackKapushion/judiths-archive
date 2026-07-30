import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface ReadingProgress {
  currentPage: number
  totalPages: number
  lastReadAt: Timestamp
}

export interface RecentlyViewedEntry {
  docId: string
  viewedAt: Timestamp
}

export interface UserData {
  favorites: string[]
  progress: Record<string, ReadingProgress>
  recentlyViewed: RecentlyViewedEntry[]
}

const defaultUserData: UserData = {
  favorites: [],
  progress: {},
  recentlyViewed: [],
}

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

export async function getUserData(uid: string): Promise<UserData> {
  const snap = await getDoc(userRef(uid))
  if (!snap.exists()) return { ...defaultUserData }
  return { ...defaultUserData, ...snap.data() } as UserData
}

export async function toggleFavorite(uid: string, docId: string): Promise<boolean> {
  const data = await getUserData(uid)
  const isFav = data.favorites.includes(docId)
  const favorites = isFav
    ? data.favorites.filter((id) => id !== docId)
    : [...data.favorites, docId]

  await setDoc(userRef(uid), { favorites }, { merge: true })
  return !isFav
}

export async function updateProgress(
  uid: string,
  docId: string,
  currentPage: number,
  totalPages: number,
): Promise<void> {
  await setDoc(
    userRef(uid),
    {
      progress: {
        [docId]: {
          currentPage,
          totalPages,
          lastReadAt: Timestamp.now(),
        },
      },
    },
    { merge: true },
  )
}

export async function addRecentlyViewed(uid: string, docId: string): Promise<void> {
  const data = await getUserData(uid)

  // Remove existing entry for this doc if present
  const filtered = data.recentlyViewed.filter((entry) => entry.docId !== docId)

  // FIFO cache: add to front, evict oldest beyond 5.
  // 5 is exactly enough to fill one full-width row on the home page.
  const recentlyViewed = [
    { docId, viewedAt: Timestamp.now() },
    ...filtered,
  ].slice(0, 5)

  await setDoc(userRef(uid), { recentlyViewed }, { merge: true })
}

export function isFavorite(userData: UserData, docId: string): boolean {
  return userData.favorites.includes(docId)
}
