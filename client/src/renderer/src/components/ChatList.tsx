import { useEffect } from 'react'
import { useAuth } from '../store/auth'
import { useChat } from '../store/chat'

export function ChatList() {
  const accessToken = useAuth((s) => s.accessToken)
  const chats = useChat((s) => s.chats)
  const activeChatId = useChat((s) => s.activeChatId)
  const openChat = useChat((s) => s.openChat)
  const loadChats = useChat((s) => s.loadChats)

  useEffect(() => {
    if (accessToken) loadChats(accessToken)
  }, [accessToken])

  if (!accessToken) return null

  if (chats.length === 0) {
    return <div className="empty">No conversations yet. Create a new chat.</div>
  }

  return (
    <div className="chat-list">
      {chats.map((chat) => {
        const name = chat.name ?? chat.members.map((m) => m.displayName).join(', ')
        const last = chat.lastMessage
        return (
          <button key={chat.id} className={chat.id === activeChatId ? 'chat-item active' : 'chat-item'} onClick={() => openChat(chat.id, accessToken)}>
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span className="chat-meta">
              <span className="chat-name">{name}</span>
              <span className="chat-last">
                {last ? (last.body ? last.body : `📷 ${last.attachments.length} image(s)`) : 'No messages yet'}
              </span>
            </span>
            {last?.isPinned && <span className="pin-dot">📌</span>}
          </button>
        )
      })}
    </div>
  )
}
