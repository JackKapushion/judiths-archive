import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  deleteUser,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth'
import { doc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { AuthModal } from './auth-modal'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
  openAuthModal: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// PERFORMANCE: authModalOpen state lives HERE (not in App) so that toggling
// the modal only re-renders AuthProvider, not the entire app tree. Since
// children is passed as a prop from App (which doesn't re-render), React
// skips re-rendering all the children (Layout, Home, cards, etc.).
// The context value is memoized so useAuth() consumers also skip re-rendering
// when only authModalOpen changes (it's not in the context value).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Handle email link sign-in callback when the app loads
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn')
      if (!email) {
        email = window.prompt('Please provide your email for confirmation')
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn')
            // Clean up the URL so the sign-in link params don't linger
            window.history.replaceState(null, '', window.location.pathname)
          })
          .catch((error) => {
            console.error('Email link sign-in failed:', error)
          })
      }
    }
  }, [])

  // useCallback on all context functions so the memoized value below only
  // changes when user or loading actually change (not on every render).
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const deleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    // Delete the user's Firestore preferences doc first (while still authed),
    // then delete the auth account. Conversations are left orphaned but become
    // inaccessible via security rules once the auth user is gone.
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid))
    } catch {
      // If the doc doesn't exist yet (user never favorited/viewed anything), that's fine
    }

    try {
      await deleteUser(currentUser)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'auth/requires-recent-login') throw err

      // Firebase requires a recent sign-in for destructive actions. If the
      // session is stale, re-authenticate via Google popup automatically
      // so the user doesn't have to manually sign out and back in.
      const providerId = currentUser.providerData[0]?.providerId
      if (providerId === 'google.com') {
        await reauthenticateWithPopup(currentUser, new GoogleAuthProvider())
        await deleteUser(currentUser)
      } else {
        // Email link users can't re-auth with a popup, so we surface
        // the original error for the UI to handle.
        throw err
      }
    }
  }, [])

  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])

  // Only user and loading cause context consumers to re-render. signOut and
  // openAuthModal are stable refs (useCallback with [] deps). authModalOpen
  // is deliberately excluded so modal toggles don't trigger consumer re-renders.
  const value = useMemo(
    () => ({ user, loading, signOut, deleteAccount, openAuthModal }),
    [user, loading, signOut, deleteAccount, openAuthModal]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal open={authModalOpen} onClose={closeAuthModal} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
