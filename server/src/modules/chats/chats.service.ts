import { prisma } from '../../db'
import { AppError } from '../../utils/errors'
import type { PublicUser } from '../../types'

export interface MessageDto {
  id: string
  body: string | null
  isPinned: boolean
  pinnedBy: string | null
  createdAt: Date
  sender: PublicUser
  attachments: { id: string; url: string; mimeType: string; size: number; filename: string }[]
}

export interface ChatDto {
  id: string
  name: string | null
  isDirect: boolean
  createdAt: Date
  updatedAt: Date
  members: PublicUser[]
  lastMessage: MessageDto | null
}

function toMessageDto(message: {
  id: string
  body: string | null
  isPinned: boolean
  pinnedBy: string | null
  createdAt: Date
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date }
  attachments: { id: string; url: string; mimeType: string; size: number; filename: string }[]
}): MessageDto {
  return {
    id: message.id,
    body: message.body,
    isPinned: message.isPinned,
    pinnedBy: message.pinnedBy,
    createdAt: message.createdAt,
    sender: {
      id: message.sender.id,
      username: message.sender.username,
      displayName: message.sender.displayName,
      avatarUrl: message.sender.avatarUrl,
      createdAt: message.sender.createdAt
    },
    attachments: message.attachments
  }
}

export function toChatDto(chat: {
  id: string
  name: string | null
  isDirect: boolean
  createdAt: Date
  updatedAt: Date
  memberships: {
    user: { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date }
  }[]
  messages: {
    id: string
    body: string | null
    isPinned: boolean
    pinnedBy: string | null
    createdAt: Date
    sender: { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date }
    attachments: { id: string; url: string; mimeType: string; size: number; filename: string }[]
  }[]
}): ChatDto {
  return {
    id: chat.id,
    name: chat.name,
    isDirect: chat.isDirect,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    members: chat.memberships.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      createdAt: m.user.createdAt
    })),
    lastMessage: chat.messages[0] ? toMessageDto(chat.messages[0]) : null
  }
}

export async function assertMembership(userId: string, chatId: string): Promise<void> {
  const membership = await prisma.membership.findUnique({
    where: { userId_chatId: { userId, chatId } }
  })
  if (!membership) {
    throw new AppError(403, 'You are not a member of this chat')
  }
}

export async function createDirectChat(userId: string, otherUserId: string): Promise<ChatDto> {
  if (userId === otherUserId) {
    throw new AppError(400, 'Cannot start a chat with yourself')
  }

  const other = await prisma.user.findUnique({ where: { id: otherUserId } })
  if (!other) {
    throw new AppError(404, 'User not found')
  }

  const memberIds = [userId, otherUserId].sort()

  const existing = await prisma.chat.findFirst({
    where: {
      isDirect: true,
      memberships: { every: { userId: { in: memberIds } } }
    },
    include: {
      memberships: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } }
    }
  })

  if (existing) {
    return toChatDto(existing)
  }

  const chat = await prisma.chat.create({
    data: {
      isDirect: true,
      createdBy: userId,
      memberships: {
        create: memberIds.map((id) => ({ userId: id, role: 'member' }))
      }
    },
    include: {
      memberships: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } }
    }
  })

  return toChatDto(chat)
}

export async function listChats(userId: string): Promise<ChatDto[]> {
  const chats = await prisma.chat.findMany({
    where: { memberships: { some: { userId } } },
    include: {
      memberships: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return chats.map(toChatDto)
}

export async function getChat(userId: string, chatId: string): Promise<ChatDto> {
  await assertMembership(userId, chatId)

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      memberships: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } } } }
    }
  })

  if (!chat) {
    throw new AppError(404, 'Chat not found')
  }

  return toChatDto(chat)
}
