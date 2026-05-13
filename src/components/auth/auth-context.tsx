import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth'
import { auth } from '../../lib/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  openAuthModal: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  onOpenAuthModal,
}: {
  children: ReactNode
  onOpenAuthModal: () => void
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, openAuthModal: onOpenAuthModal }}>
      {children}
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
