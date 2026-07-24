import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

function getSignInMethod(user: { providerData: { providerId: string }[] }) {
  const providerId = user.providerData[0]?.providerId
  if (providerId === 'google.com') return 'Google'
  if (providerId === 'password') return 'Email / Password'
  return providerId || 'Unknown'
}

export function Header() {
  const { user, loading, signOut, openAuthModal } = useAuth()
  const location = useLocation()
  const isOnChat = location.pathname.startsWith('/chat')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <header className="sticky top-0 z-20 painted-header overflow-visible">
      {/* h-16 keeps the header compact while giving items room to center properly */}
      <div className="px-6 sm:px-10 h-16 pt-4 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl leading-none py-1.5 text-[var(--color-foreground)] hover:opacity-70 flex-shrink-0">
          Judith's Archive
        </Link>

        <div id="header-search-slot" className="flex-1 min-w-0" />

        {!isOnChat && (
          <Link
            to="/chat"
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-[var(--color-foreground)] text-sm font-medium leading-none bg-white/80 hover:bg-white/95 px-4 py-1.5 rounded-full border border-[var(--color-foreground)]/10 hover:border-[var(--color-foreground)]/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            AI Chat
          </Link>
        )}

        <div className="flex items-center gap-4 flex-shrink-0">
          {loading ? null : (user && !user.isAnonymous) ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-lg text-[var(--color-foreground)] hover:opacity-70 hidden sm:inline"
              >
                Signed in as {(user.displayName || user.email || '').split(' ')[0]}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-[var(--color-foreground)]/10 py-3 px-4 text-sm">
                  <div className="space-y-2 mb-3">
                    <div>
                      <span className="text-[var(--color-foreground)]/50">Name</span>
                      <p className="text-[var(--color-foreground)]">{user.displayName || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-foreground)]/50">Email</span>
                      <p className="text-[var(--color-foreground)]">{user.email || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-foreground)]/50">Sign-in method</span>
                      <p className="text-[var(--color-foreground)]">{getSignInMethod(user)}</p>
                    </div>
                  </div>
                  <div className="border-t border-[var(--color-foreground)]/10 pt-3 space-y-2">
                    <button
                      onClick={() => { signOut(); setDropdownOpen(false) }}
                      className="w-full text-left text-[var(--color-foreground)] hover:opacity-70"
                    >
                      Sign out
                    </button>
                    <button
                      className="w-full text-left text-red-600 hover:opacity-70"
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-lg font-medium leading-none py-1.5 text-[var(--color-foreground)] hover:opacity-70"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
