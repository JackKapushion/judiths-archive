import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Persistent visitor ID stored in localStorage. Same browser = same
// visitor across sessions. Different browsers or incognito = new visitor.
function getVisitorId(): string {
  const key = 'ja-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// Fire-and-forget visit log. Called once per page load in main.tsx.
// Writes to the 'visits' Firestore collection for admin dashboard
// analytics. Silently fails so tracking never breaks the app.
export function trackVisit() {
  try {
    addDoc(collection(db, 'visits'), {
      visitorId: getVisitorId(),
      timestamp: serverTimestamp(),
      path: window.location.pathname,
    }).catch(() => {})
  } catch {
    // Analytics should never break the app
  }
}
