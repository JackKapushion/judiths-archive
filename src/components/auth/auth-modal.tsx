import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail } from 'firebase/auth'
import { auth } from '../../lib/firebase'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      onClose()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setError('Google sign-in failed. Please try again.')
    }
  }

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    }

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      window.localStorage.setItem('emailForSignIn', email)
      setEmailSent(true)
    } catch (err) {
      console.error('Email link failed:', err)
      setError('Failed to send sign-in link. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-tertiary)] rounded-lg shadow-xl w-full max-w-sm mx-4 px-6 pt-8 pb-10 painted-patch"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-medium text-[var(--color-foreground)]">Sign in to</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-foreground)]/70 hover:text-[var(--color-foreground)] text-3xl leading-none cursor-pointer p-1 -mr-1 -mt-1"
          >
            &times;
          </button>
        </div>

        <ul className="mb-5 space-y-2 text-sm text-[var(--color-foreground)]/70">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--color-foreground)]/40 flex-shrink-0" />
            Track your recently viewed documents
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--color-foreground)]/40 flex-shrink-0" />
            Save your favorite documents
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-[var(--color-foreground)]/40 flex-shrink-0" />
            Keep your AI conversation history
          </li>
        </ul>

        <div className="h-px bg-[var(--color-foreground)]/10 mb-5" />

        {emailSent ? (
          <div className="text-center py-4">
            <p className="text-[var(--color-foreground)] mb-2">Check your email!</p>
            <p className="text-sm text-[var(--color-foreground)]/60">
              We sent a sign-in link to <span className="font-medium">{email}</span>
            </p>
            <p className="text-sm text-[var(--color-foreground)]/40 mt-2">
              Don't see it? Check your spam or junk folder.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 border border-[var(--color-foreground)]/20 rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] bg-white/60 hover:bg-white/80 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>

            <div className="flex items-center gap-3 mt-4 mb-3">
              <div className="flex-1 h-px bg-[var(--color-foreground)]/20" />
              <span className="text-sm text-[var(--color-foreground)]/70">or</span>
              <div className="flex-1 h-px bg-[var(--color-foreground)]/20" />
            </div>

            <p className="text-sm text-[var(--color-foreground)]/60 mb-3">
              Don't have Gmail? Enter any email and we'll send you a link to sign in.
            </p>

            <form onSubmit={handleEmailLink}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full bg-white/60 border border-[var(--color-foreground)]/20 rounded-md px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <button
                type="submit"
                className="w-full mt-3 bg-[var(--color-primary)] text-[var(--color-foreground)] rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-colors"
              >
                Send sign-in link
              </button>
            </form>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
