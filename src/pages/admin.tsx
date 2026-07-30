import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/auth/auth-context'
import { auth } from '../lib/firebase'

interface TimeBuckets {
  today: number
  period: number
  total: number
}

interface Stats {
  period: { start: string; end: string; days: number }
  visitors: TimeBuckets
  signups: TimeBuckets
  chat: {
    conversations: TimeBuckets
    messages: TimeBuckets
    cost: TimeBuckets
  }
  spending: {
    month: number
    cap: number
  }
}

// Hover/tap tooltip for metric definitions. Uses a <button> so
// tapping on mobile gives focus (shows tooltip), tapping elsewhere
// removes focus (hides it). On desktop, hover works naturally.
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative ml-1.5 inline-block align-middle">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-foreground)]/20 text-[10px] font-medium text-[var(--color-foreground)]/40 cursor-help hover:border-[var(--color-foreground)]/40 hover:text-[var(--color-foreground)]/60 transition-colors"
        aria-label="More info"
      >
        ?
      </button>
      <span className="hidden group-hover/tip:block group-focus-within/tip:block absolute left-0 top-full mt-1.5 w-56 p-3 rounded-lg bg-[var(--color-foreground)]/95 text-white text-xs leading-relaxed shadow-lg z-50 normal-case tracking-normal font-normal">
        {text}
      </span>
    </span>
  )
}

// Ledger-style card showing today, 28-day, and all-time values.
// "Today" is the hero row (larger text), period and total are
// secondary rows below a divider.
function LedgerCard({ title, info, today, period, total, periodLabel }: {
  title: string
  info: string
  today: string
  period: string
  total: string
  periodLabel: string
}) {
  return (
    <div className="bg-white/90 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-[var(--color-foreground)]/5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]/60 mb-4">
        {title}
        <InfoTip text={info} />
      </p>
      <div className="space-y-2.5">
        {/* Today row: slightly larger to create visual hierarchy */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-[var(--color-foreground)]/60">Today</span>
          <span className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">{today}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[var(--color-foreground)]/50">{periodLabel}</span>
          <span className="text-lg font-semibold text-[var(--color-foreground)]/70 tabular-nums">{period}</span>
        </div>
        <div className="border-t border-[var(--color-foreground)]/8 pt-2.5 flex items-baseline justify-between">
          <span className="text-sm text-[var(--color-foreground)]/50">All time</span>
          <span className="text-lg font-semibold text-[var(--color-foreground)]/70 tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]/60 mb-4">
      {children}
    </h2>
  )
}

export function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Server determines admin access, not the client. We don't check
  // the user's email here so the admin email isn't exposed in the
  // frontend bundle. If the server returns 401/403, we show "Not authorized."
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) throw new Error('No auth token')

        const resp = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.status === 401 || resp.status === 403) {
          setUnauthorized(true)
          return
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch admin stats:', err)
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [authLoading, user])

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-[var(--color-foreground)]/50 mb-6">Not authorized.</p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            Back to the archive
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-[var(--color-foreground)]/50">Loading dashboard...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600/70 mb-6">{error || 'Failed to load data.'}</p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            Back to the archive
          </Link>
        </div>
      </div>
    )
  }

  const fmt = (n: number) => n.toLocaleString()
  const fmtCost = (n: number) => `$${n.toFixed(2)}`
  const periodLabel = `Last ${stats.period.days} days`

  return (
    <div
      className="min-h-screen px-4 sm:px-8 pb-16"
      // Clear the fixed header and add breathing room below it
      style={{ paddingTop: 'calc(var(--header-height, 64px) + 2rem)' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-10">
          <Link
            to="/"
            className="text-[var(--color-foreground)]/40 hover:text-[var(--color-foreground)] transition-colors"
            aria-label="Back to archive"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Dashboard</h1>
        </div>

        {/* Users: visitors and signups, each with today/28-day/all-time */}
        <SectionHeader>Users</SectionHeader>
        <div className="grid grid-cols-2 gap-4 mb-10">
          <LedgerCard
            title="Visitors"
            info="Unique browsers that have loaded the site. Each browser gets a persistent ID stored locally. Different browsers or devices count as separate visitors."
            today={fmt(stats.visitors.today)}
            period={fmt(stats.visitors.period)}
            total={fmt(stats.visitors.total)}
            periodLabel={periodLabel}
          />
          <LedgerCard
            title="Signups"
            info="Accounts created through sign-in (Google or email link). Counted from Firebase Auth creation dates. Returning users don't add to this count."
            today={fmt(stats.signups.today)}
            period={fmt(stats.signups.period)}
            total={fmt(stats.signups.total)}
            periodLabel={periodLabel}
          />
        </div>

        {/* AI Chat: counters for conversations/messages, cost breakdown,
            and the monthly spending cap bar at the bottom. */}
        <SectionHeader>AI Chat</SectionHeader>
        <div className="grid grid-cols-3 gap-4">
          <LedgerCard
            title="Conversations"
            info="Chat sessions started by users. Counted when the first message is sent. Persists even if the conversation is later deleted."
            today={fmt(stats.chat.conversations.today)}
            period={fmt(stats.chat.conversations.period)}
            total={fmt(stats.chat.conversations.total)}
            periodLabel={periodLabel}
          />
          <LedgerCard
            title="Messages"
            info="Total messages exchanged. Each chat round adds 2: one for the user's question, one for the assistant's response."
            today={fmt(stats.chat.messages.today)}
            period={fmt(stats.chat.messages.period)}
            total={fmt(stats.chat.messages.total)}
            periodLabel={periodLabel}
          />
          <LedgerCard
            title="Cost"
            info="Anthropic API spend computed from actual token usage. Claude Sonnet 5 pricing: $3/MTok input, $15/MTok output, $3.75/MTok cache write, $0.30/MTok cache read."
            today={fmtCost(stats.chat.cost.today)}
            period={fmtCost(stats.chat.cost.period)}
            total={fmtCost(stats.chat.cost.total)}
            periodLabel={periodLabel}
          />
        </div>

        {/* Monthly spending cap bar: shows progress toward the hard limit
            that disables chat. Sits below the chat cards since it's an
            operational safeguard, not a primary metric. */}
        {(() => {
          const pct = Math.min((stats.spending.month / stats.spending.cap) * 100, 100)
          // Green under 50%, amber 50-80%, red 80%+
          const barColor = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
          const atCap = stats.spending.month >= stats.spending.cap
          return (
            <div className="mt-4 bg-white/90 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-[var(--color-foreground)]/5">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]/60">
                  Monthly Cap
                  <InfoTip text="Estimated API cost for the current calendar month (UTC). When this reaches the cap, chat is disabled until next month." />
                </p>
                <p className="text-sm tabular-nums">
                  <span className="font-semibold text-[var(--color-foreground)]">
                    ${stats.spending.month.toFixed(2)}
                  </span>
                  <span className="text-[var(--color-foreground)]/40">
                    {' / $'}{stats.spending.cap}
                  </span>
                </p>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-foreground)]/8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {atCap && (
                <p className="text-xs text-red-600 font-medium mt-2">
                  Cap reached. Chat is disabled until next month.
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
