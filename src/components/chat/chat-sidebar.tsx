import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import {
  getConversations,
  groupConversationsByDate,
  renameConversation,
  deleteConversation,
  type Conversation,
} from '../../lib/conversations'

interface ChatSidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
  currentConversationId: string | null
}

function ConversationMenu({
  convo,
  isActive,
  onClose: closeSidebar,
  onRename,
  onDelete,
}: {
  convo: Conversation
  isActive: boolean
  onClose: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(convo.title)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    // preventScroll stops iOS from panning the visual viewport
    // to bring the input into view, which would shift the header
    // off screen. The input is already visible in the sidebar.
    if (renaming) inputRef.current?.focus({ preventScroll: true })
  }, [renaming])

  function handleRenameSubmit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== convo.title) {
      onRename(convo.id, trimmed)
    }
    setRenaming(false)
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={handleRenameSubmit}
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded px-2 py-1 text-base text-white focus:outline-none focus:border-white/40"
        />
        {/* Check mark confirms the rename (same position as the
            three-dot menu so users know where to tap). Clicking
            away / blurring also confirms via onBlur above. */}
        <button
          onMouseDown={(e) => {
            // mouseDown instead of onClick so it fires before
            // the input's onBlur (which also submits). Prevent
            // default to keep focus on the input until we
            // explicitly submit.
            e.preventDefault()
            handleRenameSubmit()
          }}
          className="flex-shrink-0 p-1.5 rounded text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    // Background highlight on the full row so the dots menu sits
    // inside the highlight, not next to it.
    <div className={`group relative flex items-center rounded-lg transition-colors ${
      isActive
        ? 'bg-white/15'
        : 'hover:bg-white/5'
    }`}>
      <Link
        to={`/chat/${convo.id}`}
        onClick={closeSidebar}
        className={`flex-1 min-w-0 block px-3 py-1.5 text-sm truncate transition-colors ${
          isActive
            ? 'text-white'
            : 'text-white/60 hover:text-white'
        }`}
      >
        {convo.title}
      </Link>

      <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded text-white/40 sm:text-white/0 sm:group-hover:text-white/60 hover:!text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--color-foreground)] border border-white/15 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  setRenameValue(convo.title)
                  setRenaming(true)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(convo.id)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
    </div>
  )
}

export function ChatSidebar({ open, onClose, onNewChat, currentConversationId }: ChatSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')

  // iOS scroll lock: overflow:hidden on the body doesn't prevent
  // visual viewport panning (a browser-level pan separate from
  // document scroll). position:fixed on the body is the only
  // reliable way to fully lock the page on iOS. This prevents
  // the user from scrolling the header off screen while the
  // sidebar is open (especially during rename with keyboard up).
  useEffect(() => {
    if (!open) return
    const isMobile = !window.matchMedia('(min-width: 1024px)').matches
    if (!isMobile) return

    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = '0'

    return () => {
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      window.scrollTo(0, 0)
    }
  }, [open])

  const isRealUser = user && !user.isAnonymous

  useEffect(() => {
    if (!isRealUser) {
      setConversations([])
      return
    }

    setLoadError(false)
    getConversations(user.uid)
      .then(({ conversations }) => {
        setConversations(conversations)
      })
      .catch(() => {
        setConversations([])
        setLoadError(true)
      })
  }, [isRealUser, user, currentConversationId])

  function handleRename(id: string, title: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    )
    renameConversation(id, title).catch(() => {
      // Revert on failure - refetch
      if (user) {
        getConversations(user.uid).then(({ conversations }) => {
          setConversations(conversations)
        })
      }
    })
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    deleteConversation(id).catch(() => {
      if (user) {
        getConversations(user.uid).then(({ conversations }) => {
          setConversations(conversations)
        })
      }
    })
    if (currentConversationId === id) {
      navigate('/chat')
    }
  }

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations

  const grouped = groupConversationsByDate(filtered)

  return (
    <>
      {/* Mobile overlay: onTouchMove prevents touch-scrolling the
          page behind the sidebar. */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* overscroll-behavior-contain prevents scroll chaining from
          the sidebar's conversation list to the body, which would
          let the page scroll and push the header off screen. */}
      <aside
        className={`fixed lg:relative top-0 left-0 z-40 lg:z-auto h-full w-72 bg-[var(--color-foreground)] text-white flex flex-col transition-transform duration-200 overscroll-contain ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* On mobile the sidebar is fixed full-height but the header
            overlaps it (higher z-index). This spacer pushes content
            below the header. On desktop the sidebar is relative within
            the chat container which already starts below the header. */}
        <div className="lg:hidden flex-shrink-0" style={{ height: 'var(--header-height, 64px)' }} />

        {/* Top row: Back to Archive flush to top, close button on the
            right (mobile only). Single row keeps it compact. */}
        <div className="px-3 pt-3 lg:pt-2 pb-1 flex items-center justify-between">
          {/* flex-1 makes the hover highlight span the full row width,
              matching the New Chat button below it. Without it, the
              highlight only covers the text content width. */}
          <Link
            to="/"
            onClick={onClose}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Archive
          </Link>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New chat button. Calls onNewChat which resets chat state
            and navigates to /chat. Can't just navigate('/chat') because
            anonymous users stay at /chat even with an active conversation
            (their URL never updates to /chat/{id}), making navigate a no-op. */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              onClose()
              onNewChat()
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-white/10 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-4">
          {!isRealUser && (
            <p className="text-white/50 text-sm px-3 py-2">
              Sign in to save your chats.
            </p>
          )}

          {isRealUser && loadError && (
            <p className="text-red-400/70 text-sm px-3 py-2">
              Couldn't load conversations.
            </p>
          )}

          {isRealUser && !loadError && grouped.length === 0 && !search.trim() && (
            <p className="text-white/50 text-sm px-3 py-2">
              No conversations yet.
            </p>
          )}

          {isRealUser && grouped.length === 0 && search.trim() && (
            <p className="text-white/50 text-sm px-3 py-2">
              No matching chats.
            </p>
          )}

          {grouped.map(({ label, conversations }) => (
            <div key={label} className="mb-3">
              <p className="text-white/30 text-xs uppercase tracking-wider px-3 py-1">
                {label}
              </p>
              {conversations.map((convo) => (
                <ConversationMenu
                  key={convo.id}
                  convo={convo}
                  isActive={convo.id === currentConversationId}
                  onClose={onClose}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
