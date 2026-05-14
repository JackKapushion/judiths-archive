import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

export function Header() {
  const { user, loading, signOut, openAuthModal } = useAuth()

  return (
    <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-foreground)]/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="text-lg font-normal text-[var(--color-foreground)] hover:opacity-70 flex-shrink-0">
          Softa's Archive
        </Link>

        <div id="header-search-slot" className="flex-1 min-w-0" />

        <div className="flex items-center gap-3 flex-shrink-0">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-foreground)]/60 hidden sm:inline">
                {user.displayName || user.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-[var(--color-foreground)]/60 hover:text-[var(--color-foreground)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-sm text-[var(--color-foreground)] hover:opacity-70"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
