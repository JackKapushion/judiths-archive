import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

export function Header() {
  const { user, loading, signOut, openAuthModal } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-medium text-gray-900 hover:text-gray-700">
          Softa's Archive
        </Link>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {user.displayName || user.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
