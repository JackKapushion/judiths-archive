import { useCallback } from 'react'
import { useAuth } from './auth-context'

// Returns a stable function ref (via useCallback) so that consumers like
// Home can use it as a useCallback dependency without triggering re-renders
// on every render cycle.
export function useAuthGate() {
  const { user, openAuthModal } = useAuth()

  // Depend on user?.uid instead of the full user object. The user object
  // reference changes on every auth state event (even if the uid stays
  // the same), which would unnecessarily invalidate this callback and
  // cascade re-renders through any component that depends on it.
  const isSignedIn = !!user && !user.isAnonymous
  return useCallback(
    (action: () => void) => {
      if (isSignedIn) {
        action()
      } else {
        openAuthModal()
      }
    },
    [isSignedIn, openAuthModal]
  )
}
