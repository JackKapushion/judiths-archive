import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'

function getSignInMethod(user: { providerData: { providerId: string }[] }) {
  const providerId = user.providerData[0]?.providerId
  if (providerId === 'google.com') return 'Google'
  if (providerId === 'password') return 'Email / Password'
  return providerId || 'Unknown'
}

// Shared delete-account error handler. Desktop dropdown and mobile menu both
// need the same logic, extracted here to avoid duplicating the error mapping.
async function handleDeleteAccount(
  deleteAccount: () => Promise<void>,
  onSuccess: () => void,
  setError: (msg: string) => void,
) {
  try {
    await deleteAccount()
    onSuccess()
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'auth/requires-recent-login') {
      // Only email-link users hit this since Google re-auths
      // automatically via popup in deleteAccount.
      setError('Please sign out, sign back in, and try again.')
    } else {
      setError('Something went wrong. Try again.')
    }
  }
}

export function Header() {
  const { user, loading, signOut, deleteAccount, openAuthModal } = useAuth()
  const location = useLocation()
  const isOnChat = location.pathname.startsWith('/chat')
  const isOnRead = location.pathname.startsWith('/read')
  const isHomePage = !isOnChat && !isOnRead
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // Mobile hamburger menu state (separate from the desktop user dropdown)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  // Ref on the <header> element so we can measure its height and expose it
  // as a CSS variable. Child pages (chat, viewer) reference --header-height
  // instead of hard-coding pixel values, so spacing stays correct when the
  // header height changes across pages or breakpoints.
  const headerRef = useRef<HTMLElement>(null)

  // Measure header height and expose as --header-height CSS variable.
  // Chat and viewer pages use this variable for layout calculations
  // instead of hard-coded pixel values, so everything adapts
  // automatically when the header size changes.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => {
      document.documentElement.style.setProperty(
        '--header-height', `${el.offsetHeight}px`
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Close mobile menu when clicking outside.
  // Reset delete-account confirmation when the menu closes
  // so it's fresh the next time the user opens it.
  useEffect(() => {
    if (!mobileMenuOpen) {
      setConfirmingDelete(false)
      setDeleteError(null)
      return
    }
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileMenuOpen])

  // Close mobile menu on route change so it doesn't persist after navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!dropdownOpen) {
      // Reset confirmation state whenever the dropdown closes so it's
      // fresh next time the user opens it
      setConfirmingDelete(false)
      setDeleteError(null)
      return
    }
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  // z-50 keeps the header above ALL stacking contexts including the
  // chat sidebar (z-40) and its overlay (z-30). On mobile, the sidebar
  // slides in below the header so the nav bar stays visible.
  // Category sections use z-index 10-20, search splotch uses z-21.
  return (
    <header
      ref={headerRef}
      // HOME: sticky so it participates in the document flow (hero
      // section sizing depends on it). NON-HOME (chat, viewer): fixed
      // so it's always at the viewport top regardless of body scroll
      // state. Sticky can break when the body has a stale scrollTop
      // with overflow:hidden (no scroll context to stick within).
      className={`${isHomePage ? 'sticky' : 'fixed inset-x-0'} top-0 z-50 ${isHomePage ? 'painted-header' : ''}`}
      style={!isHomePage ? { backgroundColor: 'var(--color-tertiary)' } : undefined}
    >
      {/*
       * LAYOUT PRINCIPLES:
       * 1. "Judith's Archive" and "Sign in" stay at the SAME position on every
       *    page (home, chat, viewer). Pinned to left and right edges.
       * 2. Non-home pages: no top padding, so items are vertically centered
       *    with equal space above and below the text.
       * 3. Home page: pt-4 pushes content down for the painted watercolor effect.
       * 4. The flex-1 spacer (header-search-slot) pushes right-side items
       *    (AI Chat, Sign in) to the right edge.
       * 5. Padding (px-6 sm:px-10) and gap-4 match the viewer toolbar below,
       *    so left/right edges align vertically between bars.
       */}
      {/* HOME: pt-3 pb-0 with fixed h-16 on desktop for the paint effect.
          NON-HOME (viewer, chat): py-3 for equal top/bottom padding so text
          is vertically centered in the bar. Desktop height bumped to 76px
          (64 + 12) so the extra bottom padding extends the bar downward
          without moving the title (content area stays 52px starting at 12px
          from top, identical to the old h-16/pt-3/pb-0 layout). */}
      <div className={`px-6 sm:px-10 flex items-center gap-4 ${isHomePage ? 'pt-3 pb-0 sm:pb-0 sm:h-16 sm:pt-4' : 'py-3 sm:h-[76px]'}`}>
        <Link to="/" className="text-xl leading-none py-1.5 text-[var(--color-foreground)] hover:opacity-70 flex-shrink-0">
          Judith's Archive
        </Link>

        <div id="header-search-slot" className="flex-1 min-w-0" />

        {/* Desktop nav: visible on sm+ screens */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          {!isOnChat && (
            <Link
              to="/chat"
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-[var(--color-foreground)] text-lg leading-none bg-white/80 hover:bg-white/95 px-4 py-1.5 rounded-full border border-[var(--color-foreground)]/10 hover:border-[var(--color-foreground)]/20 transition-colors"
            >
              {/* w-5 h-5 to match text-lg scale; -mt-1 for optical alignment
                  (text-lg needs less correction than smaller mobile text) */}
              <svg className="w-5 h-5 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              AI Chat
            </Link>
          )}
          {loading ? null : (user && !user.isAnonymous) ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-lg text-[var(--color-foreground)] hover:opacity-70"
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
                    {!confirmingDelete ? (
                      <button
                        onClick={() => setConfirmingDelete(true)}
                        className="w-full text-left text-red-600 hover:opacity-70"
                      >
                        Delete account
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-red-600 font-medium">Are you sure? This can't be undone.</p>
                        {deleteError && (
                          <p className="text-red-600 text-xs">{deleteError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteAccount(
                              deleteAccount,
                              () => setDropdownOpen(false),
                              setDeleteError,
                            )}
                            className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => { setConfirmingDelete(false); setDeleteError(null) }}
                            className="text-[var(--color-foreground)] hover:opacity-70 px-3 py-1 rounded text-xs border border-[var(--color-foreground)]/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-lg leading-none py-1.5 text-[var(--color-foreground)] hover:opacity-70 cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile auth: visible below sm breakpoint. text-xl matches
            "Judith's Archive" title size. "Signed in" opens a full
            account dropdown (same info as desktop). */}
        <div className="sm:hidden flex-shrink-0">
          {loading ? null : (user && !user.isAnonymous) ? (
            <div ref={mobileMenuRef} className="relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-xl text-[var(--color-foreground)] hover:opacity-70"
              >
                Signed in
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-[var(--color-foreground)]/10 z-50 py-3 px-4 text-sm">
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
                    {!isOnChat && (
                      <Link
                        to="/chat"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-[var(--color-foreground)] hover:opacity-70"
                      >
                        View AI Chats
                      </Link>
                    )}
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false) }}
                      className="w-full text-left text-[var(--color-foreground)] hover:opacity-70"
                    >
                      Sign out
                    </button>
                    {!confirmingDelete ? (
                      <button
                        onClick={() => setConfirmingDelete(true)}
                        className="w-full text-left text-red-600 hover:opacity-70"
                      >
                        Delete account
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-red-600 font-medium">Are you sure? This can't be undone.</p>
                        {deleteError && (
                          <p className="text-red-600 text-xs">{deleteError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteAccount(
                              deleteAccount,
                              () => setMobileMenuOpen(false),
                              setDeleteError,
                            )}
                            className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => { setConfirmingDelete(false); setDeleteError(null) }}
                            className="text-[var(--color-foreground)] hover:opacity-70 px-3 py-1 rounded text-xs border border-[var(--color-foreground)]/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="text-xl text-[var(--color-foreground)] hover:opacity-70 cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
