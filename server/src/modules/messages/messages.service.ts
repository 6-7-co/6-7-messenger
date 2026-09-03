import { prisma } from '../../db'
import { AppError } from '../../utils/errors'
import { assertMembership } from '../chats/chats.service'
import { publishChatEvent } from '../ws/hub'
import type { PublicUser } from '../../types'

export interface AttachmentInput {
  url: string
  mimeType: string
  size: number
  filename: string
}

export interface MessageDto {
  id: string
  body: string | null
  isPinned: boolean
  pinnedBy: string | null
  createdAt: Date
  updatedAt: Date
  sender: PublicUser
  attachments: { id: string; url: string; mimeType: string; size: number; filename: string }[]
}

const MESSAGE_SELECT = {
  id: true,
  body: true,
  isPinned: true,
  pinnedBy: true,
  createdAt: true,
  updatedAt: true,
  sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, createdAt: true } },
  attachments: { select: { id: true, url: true, mimeType: true, size: true, filename: true } }
} as const

export function toMessageDto(message: {
  id: string
  body: string | null
  isPinned: boolean
  pinnedBy: string | null
  createdAt: Date
  updatedAt: Date
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null; createdAt: Date }
  attachments: { id: string; url: string; mimeType: string; size: number; filename: string }[]
}): MessageDto {
  return {
    id: message.id,
    body: message.body,
    isPinned: message.isPinned,
    pinnedBy: message.pinnedBy,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
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

export async function listMessages(userId: string, chatId: string, before?: string, limit = 50): Promise<MessageDto[]> {
  await assertMembership(userId, chatId)

  const clampedLimit = Math.min(Math.max(limit, 1), 100)
  const messages = await prisma.message.findMany({
    where: {
      chatId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: clampedLimit,
    select: MESSAGE_SELECT
  })

  return messages.map(toMessageDto)
}

export async function sendMessage(userId: string, chatId: string, input: { body?: string | null; attachments?: AttachmentInput[] }) {
  await assertMembership(userId, chatId)

  const body = input.body?.trim() || null
  const attachments = input.attachments ?? []

  if (!body && attachments.length === 0) {
    throw new AppError(400, 'Message body or attachments are required')
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      body,
      attachments: {
        create: attachments.map((a) => ({
          url: a.url,
          mimeType: a.mimeType,
          size: a.size,
          filename: a.filename
        }))
      }
    },
    select: MESSAGE_SELECT
  })

  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })

  const dto = toMessageDto(message)
  await publishChatEvent({ type: 'message:new', chatId, payload: dto })
  return dto
}

export async function setMessagePinned(userId: string, chatId: string, messageId: string, pinned: boolean): Promise<MessageDto> {
  await assertMembership(userId, chatId)

  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message || message.chatId !== chatId) {
    throw new AppError(404, 'Message not found')
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      isPinned: pinned,
      pinnedBy: pinned ? userId : null,
      pinnedAt: pinned ? new Date() : null
    },
    select: MESSAGE_SELECT
  })

  const dto = toMessageDto(updated)
  await publishChatEvent({ type: 'message:updated', chatId, payload: dto })
  return dto
}

export async function deleteMessage(userId: string, chatId: string, messageId: string): Promise<void> {
  await assertMembership(userId, chatId)

  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message || message.chatId !== chatId) {
    throw new AppError(404, 'Message not found')
  }
  if (message.senderId !== userId) {
    throw new AppError(403, 'You can only delete your own messages')
  }

  await prisma.message.delete({ where: { id: messageId } })
  await publishChatEvent({ type: 'message:deleted', chatId, payload: { id: messageId } })
}
