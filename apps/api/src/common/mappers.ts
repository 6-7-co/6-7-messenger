import type { Conversation, Message, PublicUser } from '@messenger/shared';

export function mapMessage(m: {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
}): Message {
  const deleted = m.deletedAt !== null;
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    type: m.type as Message['type'],
    content: deleted ? null : m.content,
    imageUrl: deleted ? null : m.imageUrl,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    sender: m.sender ? toPublicUser(m.sender) : undefined,
  };
}

export function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export function mapConversation(
  c: {
    id: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    members: Array<{
      lastReadAt: Date;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        createdAt: Date;
      };
    }>;
    pinned?: {
      conversationId: string;
      messageId: string;
      pinnedBy: string;
      pinnedAt: Date;
      message?: Parameters<typeof mapMessage>[0];
    } | null;
  },
  userId: string,
  lastMessage: Parameters<typeof mapMessage>[0] | null,
  unreadCount: number,
): Conversation {
  const member = c.members.find((m) => m.user.id === userId);
  return {
    id: c.id,
    type: c.type as Conversation['type'],
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    members: c.members.map((m) => ({
      ...toPublicUser(m.user),
      lastReadAt: m.lastReadAt.toISOString(),
    })),
    pinnedMessage: c.pinned
      ? {
          conversationId: c.pinned.conversationId,
          messageId: c.pinned.messageId,
          pinnedBy: c.pinned.pinnedBy,
          pinnedAt: c.pinned.pinnedAt.toISOString(),
          message: c.pinned.message ? mapMessage(c.pinned.message) : undefined,
        }
      : null,
    lastMessage: lastMessage ? mapMessage(lastMessage) : null,
    unreadCount: member ? unreadCount : 0,
  };
}
