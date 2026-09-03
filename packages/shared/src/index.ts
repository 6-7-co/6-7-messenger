export type MessageType = 'TEXT' | 'IMAGE';

export type ConversationType = 'DIRECT' | 'GROUP';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ConversationMember extends PublicUser {
  lastReadAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sender?: PublicUser;
}

export interface PinnedMessage {
  conversationId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
  message?: Message;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  pinnedMessage: PinnedMessage | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  online: boolean;
}

export interface UnpinnedPayload {
  conversationId: string;
}

export const Events = {
  messageNew: 'message:new',
  messageUpdated: 'message:updated',
  messageDeleted: 'message:deleted',
  messagePinned: 'message:pinned',
  messageUnpinned: 'message:unpinned',
  typing: 'typing',
  presence: 'presence:update',
  conversationNew: 'conversation:new',
} as const;

export const ClientEvents = {
  typingSet: 'typing:set',
} as const;
