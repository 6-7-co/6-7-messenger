import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Message } from '@messenger/shared';
import { resolveUrl } from '../lib/env';
import { CloseIcon, EditIcon, PinIcon, TrashIcon } from './Icons';
import { Lightbox } from './Lightbox';

interface MessageBubbleProps {
  message: Message;
  own: boolean;
  onPin: () => void;
  onDelete: () => void;
  onEdit: (content: string) => Promise<void>;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, own, onPin, onDelete, onEdit }: MessageBubbleProps) {
  const [lightbox, setLightbox] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content ?? '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = async () => {
    const value = draft.trim();
    if (!value) return;
    await onEdit(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setDraft(message.content ?? '');
    }
  };

  const deleted = !!message.deletedAt;

  return (
    <div className={`message-row ${own ? 'own' : 'other'}`}>
      <div className={`bubble ${deleted ? 'deleted' : ''}`}>
        {deleted ? (
          <span className="bubble-deleted">Message deleted</span>
        ) : message.type === 'IMAGE' && message.imageUrl ? (
          <button className="image-message" onClick={() => setLightbox(true)}>
            <img src={resolveUrl(message.imageUrl)} alt="attachment" loading="lazy" />
          </button>
        ) : editing ? (
          <textarea
            ref={inputRef}
            className="edit-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={Math.min(8, draft.split('\n').length)}
          />
        ) : (
          <span className="bubble-text">{message.content}</span>
        )}

        {!editing && (
          <div className="message-actions">
            {!deleted && (
              <button className="action-btn" onClick={onPin} title="Pin message">
                <PinIcon size={14} />
              </button>
            )}
            {own && !deleted && message.type === 'TEXT' && (
              <button
                className="action-btn"
                onClick={() => setEditing(true)}
                title="Edit message"
              >
                <EditIcon size={14} />
              </button>
            )}
            {own && !deleted && (
              <button className="action-btn danger" onClick={onDelete} title="Delete message">
                <TrashIcon size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="message-time">
        {!editing && !deleted && formatTime(message.createdAt)}
        {editing && (
          <span className="edit-hint">
            <button className="action-btn" onClick={() => void save()} title="Save">
              <EditIcon size={13} />
            </button>
            <button
              className="action-btn"
              onClick={() => {
                setEditing(false);
                setDraft(message.content ?? '');
              }}
              title="Cancel"
            >
              <CloseIcon size={13} />
            </button>
          </span>
        )}
      </div>

      {lightbox && message.imageUrl && (
        <Lightbox url={resolveUrl(message.imageUrl)} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
