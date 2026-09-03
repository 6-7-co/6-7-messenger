import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { mapConversation } from '../common/mappers';
import type { Conversation } from '@messenger/shared';

const convInclude = {
  members: { include: { user: true } },
  pinned: { include: { message: { include: { sender: true } } } },
} as const;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(userId: string): Promise<Conversation[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      include: convInclude,
      orderBy: { updatedAt: 'desc' },
    });

    const result: Conversation[] = [];
    for (const c of conversations) {
      const member = c.members.find((m) => m.userId === userId);
      const lastMessage = await this.prisma.message.findFirst({
        where: { conversationId: c.id },
        include: { sender: true },
        orderBy: { createdAt: 'desc' },
      });
      const unreadCount = member
        ? await this.prisma.message.count({
            where: {
              conversationId: c.id,
              senderId: { not: userId },
              createdAt: { gt: member.lastReadAt },
            },
          })
        : 0;
      result.push(mapConversation(c, userId, lastMessage, unreadCount));
    }

    return result;
  }

  async get(userId: string, conversationId: string): Promise<Conversation> {
    const conversation = await this.getForMember(userId, conversationId);
    const member = conversation.members.find((m) => m.userId === userId);
    const lastMessage = await this.prisma.message.findFirst({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = member
      ? await this.prisma.message.count({
          where: {
            conversationId,
            senderId: { not: userId },
            createdAt: { gt: member.lastReadAt },
          },
        })
      : 0;
    return mapConversation(conversation, userId, lastMessage, unreadCount);
  }

  async createDirect(userId: string, username: string): Promise<Conversation> {
    const target = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === userId) throw new ForbiddenException('Cannot create a conversation with yourself');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: target.id } } },
        ],
      },
      include: convInclude,
    });

    if (existing) {
      const lastMessage = await this.prisma.message.findFirst({
        where: { conversationId: existing.id },
        include: { sender: true },
        orderBy: { createdAt: 'desc' },
      });
      return mapConversation(existing, userId, lastMessage, 0);
    }

    const created = await this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [{ userId }, { userId: target.id }],
        },
      },
      include: convInclude,
    });

    const conversation = mapConversation(created, userId, null, 0);
    this.realtime.emitConversationNew(created.id, [userId, target.id], conversation);
    return conversation;
  }

  async markRead(userId: string, conversationId: string) {
    await this.getForMember(userId, conversationId);
    const updated = await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return {
      conversationId,
      userId,
      lastReadAt: updated.lastReadAt.toISOString(),
    };
  }

  async ensureMember(userId: string, conversationId: string): Promise<boolean> {
    const count = await this.prisma.conversationMember.count({
      where: { conversationId, userId },
    });
    return count > 0;
  }

  private async getForMember(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId } } },
      include: convInclude,
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
