import { EventEmitter } from 'node:events'
import { prisma } from '../../db'

export type ChatEventType = 'message:new' | 'message:updated' | 'message:deleted' | 'chat:new'

export interface ChatEvent {
  type: ChatEventType
  chatId: string
  payload: unknown
}

const emitter = new EventEmitter()

export function subscribeToChatEvents(listener: (event: ChatEvent) => void): void {
  emitter.on('chat', listener)
}

export async function publishChatEvent(event: ChatEvent): Promise<void> {
  const members = await prisma.membership.findMany({
    where: { chatId: event.chatId },
    select: { userId: true }
  })

  const userIds = members.map((m: { userId: string }) => m.userId)
  emitter.emit('chat', { ...event, payload: { ...(event.payload as Record<string, unknown>), chatId: event.chatId, memberIds: userIds } })
}
