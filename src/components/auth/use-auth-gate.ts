import { useAuth } from './auth-context'

export function useAuthGate() {
  const { user, openAuthModal } = useAuth()

  return (action: () => void) => {
    if (user) {
      action()
    } else {
      openAuthModal()
    }
  }
}
