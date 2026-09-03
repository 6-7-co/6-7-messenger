import { useEffect, useLayoutEffect, useRef } from 'react';
import { useStore } from '../store';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PinnedBar } from './PinnedBar';
import { LogoIcon } from './Icons';
import type { Conversation, PublicUser } from '@messenger/shared';

function otherMember(conversation: Conversation, me: PublicUser | null): PublicUser | undefined {
  return conversation.members.find((m) => m.id !== me?.id) ?? conversation.members[0];
}

export function ChatWindow() {
  const {
    user,
    conversations,
    activeId,
    messages,
    pinned,
    typing,
    presence,
    loadOlder,
    pinMessage,
    unpinMessage,
    deleteMessage,
    editMessage,
  } = useStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStick = useRef(true);
  const loadingOlder = useRef(false);
  const pendingAnchor = useRef<{ prevHeight: number; prevTop: number } | null>(null);

  const conversation = conversations.find((c) => c.id === activeId) ?? null;
  const member = conversation ? otherMember(conversation, user) : null;
  const list = activeId ? messages[activeId] ?? [] : [];
  const activePinned = activeId ? pinned[activeId] ?? null : null;
  const typingUsers = activeId ? (typing[activeId] ?? []).filter((id) => id !== user?.id) : [];
  const isTyping = typingUsers.length > 0;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldStick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 40 && activeId && !loadingOlder.current) {
      loadingOlder.current = true;
      pendingAnchor.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
      void loadOlder(activeId).finally(() => {
        loadingOlder.current = false;
      });
    }
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const anchor = pendingAnchor.current;
    if (anchor) {
      el.scrollTop = el.scrollHeight - anchor.prevHeight + anchor.prevTop;
      pendingAnchor.current = null;
      return;
    }
    if (shouldStick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [list.length, activeId]);

  useEffect(() => {
    shouldStick.current = true;
  }, [activeId]);

  if (!conversation || !activeId) {
    return (
      <main className="chat empty">
        <div className="empty-state">
          <LogoIcon size={48} />
          <h2>Select a conversation</h2>
          <p>Choose a chat from the list or start a new one by username</p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <div className="chat-title">
          <Avatar user={member} size={38} online={member ? presence[member.id] : false} />
          <div>
            <span className="chat-name">{member?.displayName ?? 'Unknown'}</span>
            <span className="chat-status">
              {isTyping
                ? 'typing…'
                : member && presence[member.id]
                  ? 'online'
                  : member
                    ? `@${member.username}`
                    : ''}
            </span>
          </div>
        </div>
      </header>

      {activePinned && (
        <PinnedBar pinned={activePinned} onUnpin={() => void unpinMessage(activeId)} />
      )}

      <div className="messages" ref={scrollRef} onScroll={onScroll}>
        <div className="messages-inner">
          {list.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              own={msg.senderId === user?.id}
              onPin={() => void pinMessage(activeId, msg.id)}
              onDelete={() => void deleteMessage(msg.id)}
              onEdit={(content) => editMessage(msg.id, content)}
            />
          ))}
        </div>
      </div>

      <MessageInput conversationId={activeId} />
    </main>
  );
}
