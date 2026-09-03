import { resolveUrl } from '../lib/env';
import { CloseIcon, PinIcon } from './Icons';
import type { PinnedMessage } from '@messenger/shared';

interface PinnedBarProps {
  pinned: PinnedMessage;
  onUnpin: () => void;
}

export function PinnedBar({ pinned, onUnpin }: PinnedBarProps) {
  const msg = pinned.message;
  const preview = msg?.deletedAt
    ? 'Message deleted'
    : msg?.type === 'IMAGE'
      ? 'Photo'
      : msg?.content;

  return (
    <div className="pinned-bar">
      <div className="pinned-icon">
        <PinIcon size={14} />
      </div>
      <div className="pinned-content">
        <span className="pinned-label">Pinned message</span>
        <span className="pinned-preview">
          {msg?.type === 'IMAGE' && !msg?.deletedAt && msg?.imageUrl ? (
            <img src={resolveUrl(msg.imageUrl)} alt="" />
          ) : null}
          {preview}
        </span>
      </div>
      <button className="icon-btn" onClick={onUnpin} title="Unpin">
        <CloseIcon size={15} />
      </button>
    </div>
  );
}
