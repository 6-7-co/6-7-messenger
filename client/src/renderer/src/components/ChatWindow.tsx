import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../store/auth'
import { useChat } from '../store/chat'
import { MessageBubble } from './MessageBubble'
import type { Message } from '../api/types'

export function ChatWindow() {
  const accessToken = useAuth((s) => s.accessToken)
  const user = useAuth((s) => s.user)
  const chats = useChat((s) => s.chats)
  const activeChatId = useChat((s) => s.activeChatId)
  const messagesByChat = useChat((s) => s.messagesByChat)
  const loadingMessages = useChat((s) => s.loadingMessages)
  const sendMessage = useChat((s) => s.sendMessage)
  const togglePin = useChat((s) => s.togglePin)
  const deleteMessageAction = useChat((s) => s.deleteMessage)

  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const chat = chats.find((c) => c.id === activeChatId) ?? null
  const messages = (activeChatId ? messagesByChat[activeChatId] : null) ?? []
  const pinned = messages.filter((m) => m.isPinned)

  useEffect(() => {
    scrollToBottom()
  }, [activeChatId, messages.length])

  useEffect(() => {
    if (!chat) return
    document.title = `${chat.name ?? chat.members.map((m) => m.displayName).join(', ')} — Messenger`
  }, [chat])

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  if (!chat || !accessToken || !user) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">6&7</div>
        <p>Select a conversation to start messaging.</p>
      </div>
    )
  }

  const name = chat.name ?? chat.members.map((m) => m.displayName).join(', ')

  const onSend = async () => {
    const body = text.trim()
    if (!body && files.length === 0) return
    if (!activeChatId) return
    setSending(true)
    try {
      await sendMessage(activeChatId, body || null, files, accessToken)
      setText('')
      setFiles([])
      if (fileRef.current) fileRef.current.value = ''
      scrollToBottom()
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked].slice(0, 5))
  }

  const onPin = async (message: Message, pinnedNext: boolean) => {
    await togglePin(chat.id, message.id, pinnedNext, accessToken)
  }

  const onDelete = async (message: Message) => {
    await deleteMessageAction(chat.id, message.id, accessToken)
  }

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div className="chat-title">
          <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h2>{name}</h2>
            <span className="chat-subtitle">{chat.members.map((m) => `@${m.username}`).join(', ')}</span>
          </div>
        </div>
      </header>

      {pinned.length > 0 && (
        <div className="pinned">
          <div className="pinned-label">📌 Pinned</div>
          {pinned.map((m) => (
            <div key={m.id} className="pinned-item">
              <span>{m.body ?? `📷 image`}</span>
              <button className="text-btn" onClick={() => onPin(m, false)}>
                Unpin
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && <div className="empty">No messages yet. Say hello!</div>}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender.id === user.id}
            onTogglePin={onPin}
            onDelete={onDelete}
          />
        ))}
        {loadingMessages === chat.id && <div className="empty">Loading…</div>}
      </div>

      <footer className="composer">
        {files.length > 0 && (
          <div className="file-thumbs">
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="file-thumb">
                <img src={URL.createObjectURL(f)} alt={f.name} />
              </span>
            ))}
          </div>
        )}
        <div className="composer-row">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden onChange={onPickFiles} />
          <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Attach image">
            <span>📷</span>
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            rows={1}
          />
          <button className="primary send" onClick={onSend} disabled={sending || (!text.trim() && files.length === 0)}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  )
}
