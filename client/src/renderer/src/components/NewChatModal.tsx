import { useState } from 'react'
import { useAuth } from '../store/auth'
import { useChat } from '../store/chat'
import { api } from '../api/client'
import type { PublicUser } from '../api/types'

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const accessToken = useAuth((s) => s.accessToken)
  const createChatWith = useChat((s) => s.createChatWith)
  const openChat = useChat((s) => s.openChat)
  const setError = useChat((s) => s.setError)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)

  const runSearch = async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }
    if (!accessToken) return
    setSearching(true)
    try {
      const users = await api.searchUsers(q.trim(), accessToken)
      setResults(users)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const startChat = async (user: PublicUser) => {
    if (!accessToken) return
    try {
      const chat = await createChatWith(user.id, accessToken)
      await openChat(chat.id, accessToken)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>New chat</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <input
          className="search"
          placeholder="Search by username or display name…"
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          autoFocus
        />
        <div className="results">
          {searching && <div className="empty">Searching…</div>}
          {!searching && results.length === 0 && query && <div className="empty">No users found.</div>}
          {results.map((user) => (
            <button key={user.id} className="result" onClick={() => startChat(user)}>
              <span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{user.displayName}</strong>
                <span className="muted">@{user.username}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
