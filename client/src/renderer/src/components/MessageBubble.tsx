import { absoluteUrl } from '../api/client'
import type { Message } from '../api/types'

interface Props {
  message: Message
  isOwn: boolean
  onTogglePin: (message: Message, pinned: boolean) => void
  onDelete: (message: Message) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, isOwn, onTogglePin, onDelete }: Props) {
  return (
    <div className={isOwn ? 'msg own' : 'msg'}>
      <span className="msg-avatar">{message.sender.displayName.slice(0, 1).toUpperCase()}</span>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-name">{message.sender.displayName}</span>
          <span className="msg-time">{formatTime(message.createdAt)}</span>
        </div>
        <div className="msg-content">
          {message.body && <p>{message.body}</p>}
          {message.attachments.length > 0 && (
            <div className="msg-images">
              {message.attachments.map((a) => (
                <img key={a.id} src={absoluteUrl(a.url)} alt={a.filename} loading="lazy" />
              ))}
            </div>
          )}
        </div>
        <div className="msg-actions">
          {message.isPinned && <span className="pin-note">📌 Pinned</span>}
          <button className="text-btn" onClick={() => onTogglePin(message, !message.isPinned)}>
            {message.isPinned ? 'Unpin' : 'Pin'}
          </button>
          {isOwn && (
            <button className="text-btn danger" onClick={() => onDelete(message)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
