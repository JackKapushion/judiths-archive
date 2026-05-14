import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

function getSignInMethod(user: { providerData: { providerId: string }[] }) {
  const providerId = user.providerData[0]?.providerId
  if (providerId === 'google.com') return 'Google'
  if (providerId === 'password') return 'Email / Password'
  return providerId || 'Unknown'
}

export function Header() {
  const { user, loading, signOut, openAuthModal } = useAuth()
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
    <header className="sticky top-0 z-20 bg-[var(--color-background)] border-b border-[var(--color-foreground)]/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="text-lg font-normal text-[var(--color-foreground)] hover:opacity-70 flex-shrink-0">
          Judith's Archive
        </Link>

        <div id="header-search-slot" className="flex-1 min-w-0" />

        <div className="flex items-center gap-3 flex-shrink-0">
          {loading ? null : user ? (
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
              className="text-lg font-medium text-[var(--color-foreground)] bg-white/30 px-3 py-1 rounded hover:bg-white/50"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
