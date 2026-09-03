import { resolveUrl } from '../lib/env';
import type { PublicUser } from '@messenger/shared';

interface AvatarProps {
  user: PublicUser | undefined | null;
  size?: number;
  online?: boolean;
}

function initials(user: PublicUser): string {
  const name = user.displayName || user.username;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ user, size = 40, online }: AvatarProps) {
  const url = resolveUrl(user?.avatarUrl);
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={user?.displayName} draggable={false} />
      ) : (
        <span className="avatar-initials" style={{ fontSize: size * 0.38 }}>
          {user ? initials(user) : '?'}
        </span>
      )}
      {online !== undefined && (
        <span className={`avatar-status ${online ? 'is-online' : ''}`} />
      )}
    </div>
  );
}
