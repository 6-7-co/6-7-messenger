import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { Avatar } from './Avatar';
import { LogoIcon, LogoutIcon, PinIcon, PlusIcon } from './Icons';
import { resolveUrl } from '../lib/env';
import type { Conversation, PublicUser } from '@messenger/shared';

function otherMember(conversation: Conversation, me: PublicUser | null): PublicUser | undefined {
  return conversation.members.find((m) => m.id !== me?.id) ?? conversation.members[0];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

function preview(conversation: Conversation): string {
  const last = conversation.lastMessage;
  if (!last) return 'No messages yet';
  if (last.deletedAt) return 'Message deleted';
  if (last.type === 'IMAGE') return 'Photo';
  return last.content ?? '';
}

export function Sidebar() {
  const {
    user,
    conversations,
    activeId,
    setActiveId,
    pinned,
    presence,
    logout,
    createConversation,
  } = useStore();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    setError(null);
    setBusy(true);
    try {
      await createConversation(name);
      setUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User not found');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="brand">
          <LogoIcon size={26} />
          <span>Messenger</span>
        </div>
        <div className="me">
          <Avatar user={user} size={30} />
          <span className="me-name">{user?.displayName}</span>
          <button className="icon-btn" onClick={() => void logout()} title="Sign out">
            <LogoutIcon size={16} />
          </button>
        </div>
      </header>

      <form className="new-chat" onSubmit={submitNew}>
        <input
          className="field"
          placeholder="Start chat by username…"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          spellCheck={false}
        />
        <button className="icon-btn" type="submit" disabled={busy} title="New chat">
          <PlusIcon size={18} />
        </button>
      </form>
      {error && <div className="sidebar-error">{error}</div>}

      <nav className="conversation-list">
        {conversations.length === 0 && (
          <div className="empty-list">
            <p>No conversations yet</p>
            <span>Add a friend by username to start chatting</span>
          </div>
        )}
        {conversations.map((conversation) => {
          const member = otherMember(conversation, user);
          const online = member ? presence[member.id] : false;
          const isPinned = !!pinned[conversation.id];
          const isActive = conversation.id === activeId;
          return (
            <button
              key={conversation.id}
              className={`conversation-row ${isActive ? 'active' : ''}`}
              onClick={() => setActiveId(conversation.id)}
            >
              <Avatar user={member} size={42} online={online} />
              <div className="conversation-meta">
                <div className="conversation-top">
                  <span className="conversation-name">{member?.displayName ?? 'Unknown'}</span>
                  {isPinned && <PinIcon size={12} />}
                  <span className="conversation-time">
                    {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <div className="conversation-bottom">
                  <span className="conversation-preview">
                    {conversation.lastMessage?.type === 'IMAGE' && !conversation.lastMessage.deletedAt ? (
                      <img
                        className="preview-thumb"
                        src={resolveUrl(conversation.lastMessage.imageUrl)}
                        alt=""
                      />
                    ) : null}
                    {preview(conversation)}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="unread-badge">{conversation.unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
