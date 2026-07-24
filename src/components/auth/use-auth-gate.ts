import { useCallback } from 'react'
import { useAuth } from './auth-context'

// Returns a stable function ref (via useCallback) so that consumers like
// Home can use it as a useCallback dependency without triggering re-renders
// on every render cycle.
export function useAuthGate() {
  const { user, openAuthModal } = useAuth()

  return useCallback(
    (action: () => void) => {
      if (user && !user.isAnonymous) {
        action()
      } else {
        openAuthModal()
      }
    },
    [user, openAuthModal]
  )
}
