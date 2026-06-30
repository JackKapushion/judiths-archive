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
import { DEMO_CONVERSATIONS, isDemoConversation } from '../../lib/demo-data'

interface ChatSidebarProps {
  open: boolean
  onClose: () => void
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
    if (renaming) inputRef.current?.focus()
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
      <div className="px-1 py-0.5">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={handleRenameSubmit}
          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white/40"
        />
      </div>
    )
  }

  return (
    <div className="group relative flex items-center">
      <Link
        to={`/chat/${convo.id}`}
        onClick={closeSidebar}
        className={`flex-1 min-w-0 block px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        {convo.title}
      </Link>

      <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-white/0 group-hover:text-white/40 hover:!text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
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

export function ChatSidebar({ open, onClose, currentConversationId }: ChatSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) {
      setConversations([])
      return
    }

    getConversations(user.uid)
      .then(({ conversations }) => {
        setConversations([...conversations, ...DEMO_CONVERSATIONS])
      })
      .catch(() => {
        setConversations(DEMO_CONVERSATIONS)
      })
  }, [user, currentConversationId])

  function handleRename(id: string, title: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    )
    renameConversation(id, title).catch(() => {
      // Revert on failure - refetch
      if (user) {
        getConversations(user.uid).then(({ conversations }) => {
          setConversations([...conversations, ...DEMO_CONVERSATIONS])
        })
      }
    })
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    deleteConversation(id).catch(() => {
      if (user) {
        getConversations(user.uid).then(({ conversations }) => {
          setConversations([...conversations, ...DEMO_CONVERSATIONS])
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:relative top-0 left-0 z-40 lg:z-auto h-full w-72 bg-[var(--color-foreground)] text-white flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-1 flex items-center justify-end">
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-white/50 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-4 pb-2">
          <Link
            to="/chat"
            onClick={onClose}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </Link>
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
          {!user && (
            <p className="text-white/40 text-sm px-3 py-2">
              Sign in to save your chats.
            </p>
          )}

          {user && grouped.length === 0 && !search.trim() && (
            <p className="text-white/30 text-sm px-3 py-2">
              No conversations yet.
            </p>
          )}

          {user && grouped.length === 0 && search.trim() && (
            <p className="text-white/30 text-sm px-3 py-2">
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
