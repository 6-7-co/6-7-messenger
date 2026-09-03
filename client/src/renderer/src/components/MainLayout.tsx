import { useState } from 'react'
import { useAuth } from '../store/auth'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import { NewChatModal } from './NewChatModal'

export function MainLayout({ onLogout }: { onLogout: () => void }) {
  const user = useAuth((s) => s.user)
  const [showNewChat, setShowNewChat] = useState(false)

  if (!user) return null

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="me">
            <span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div className="me-info">
              <strong>{user.displayName}</strong>
              <span>@{user.username}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onLogout} title="Sign out">
            <span>⎋</span>
          </button>
        </header>
        <button className="new-chat" onClick={() => setShowNewChat(true)}>
          + New chat
        </button>
        <ChatList />
      </aside>
      <main className="content">
        <ChatWindow />
      </main>
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  )
}
