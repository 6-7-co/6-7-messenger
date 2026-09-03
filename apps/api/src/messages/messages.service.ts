import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ConversationsService } from '../conversations/conversations.service';
import { mapMessage } from '../common/mappers';
import type { Message, PinnedMessage } from '@messenger/shared';

const messageInclude = { sender: true } as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly conversations: ConversationsService,
  ) {}

  async list(
    userId: string,
    conversationId: string,
    before?: string,
    limit = 50,
  ): Promise<Message[]> {
    await this.assertMember(userId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse().map(mapMessage);
  }

  async sendText(userId: string, conversationId: string, content: string): Promise<Message> {
    await this.assertMember(userId, conversationId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'TEXT',
        content: content.trim(),
      },
      include: messageInclude,
    });
    await this.touchConversation(conversationId);
    const dto = mapMessage(message);
    this.realtime.emitMessageNew(conversationId, dto);
    return dto;
  }

  async sendImage(
    userId: string,
    conversationId: string,
    imageUrl: string,
    meta: { width?: number; height?: number; size?: number } = {},
  ): Promise<Message> {
    await this.assertMember(userId, conversationId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'IMAGE',
        imageUrl,
        imageMeta: meta as object,
      },
      include: messageInclude,
    });
    await this.touchConversation(conversationId);
    const dto = mapMessage(message);
    this.realtime.emitMessageNew(conversationId, dto);
    return dto;
  }

  async edit(userId: string, messageId: string, content: string): Promise<Message> {
    const message = await this.findMessage(messageId);
    if (message.senderId !== userId) throw new ForbiddenException();
    if (message.deletedAt) throw new NotFoundException('Message not found');
    if (message.type !== 'TEXT') throw new ForbiddenException('Only text messages can be edited');

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim() },
      include: messageInclude,
    });
    const dto = mapMessage(updated);
    this.realtime.emitMessageUpdated(updated.conversationId, dto);
    return dto;
  }

  async remove(userId: string, messageId: string): Promise<Message> {
    const message = await this.findMessage(messageId);
    if (message.senderId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null, imageUrl: null },
      include: messageInclude,
    });
    const dto = mapMessage(updated);
    this.realtime.emitMessageDeleted(updated.conversationId, dto);
    return dto;
  }

  async pin(userId: string, conversationId: string, messageId: string): Promise<PinnedMessage> {
    await this.assertMember(userId, conversationId);
    const message = await this.findMessage(messageId);
    if (message.conversationId !== conversationId) throw new NotFoundException('Message not found');
    if (message.deletedAt) throw new NotFoundException('Message not found');

    const pinned = await this.prisma.pinnedMessage.upsert({
      where: { conversationId },
      create: {
        conversationId,
        messageId,
        pinnedBy: userId,
      },
      update: {
        messageId,
        pinnedBy: userId,
        pinnedAt: new Date(),
      },
      include: { message: { include: { sender: true } } },
    });

    const dto: PinnedMessage = {
      conversationId: pinned.conversationId,
      messageId: pinned.messageId,
      pinnedBy: pinned.pinnedBy,
      pinnedAt: pinned.pinnedAt.toISOString(),
      message: mapMessage(pinned.message),
    };
    this.realtime.emitMessagePinned(conversationId, dto);
    return dto;
  }

  async unpin(userId: string, conversationId: string) {
    await this.assertMember(userId, conversationId);
    await this.prisma.pinnedMessage.deleteMany({ where: { conversationId } });
    const payload = { conversationId };
    this.realtime.emitMessageUnpinned(conversationId, payload);
    return payload;
  }

  async getPinned(userId: string, conversationId: string): Promise<PinnedMessage | null> {
    await this.assertMember(userId, conversationId);
    const pinned = await this.prisma.pinnedMessage.findUnique({
      where: { conversationId },
      include: { message: { include: { sender: true } } },
    });
    if (!pinned) return null;
    return {
      conversationId: pinned.conversationId,
      messageId: pinned.messageId,
      pinnedBy: pinned.pinnedBy,
      pinnedAt: pinned.pinnedAt.toISOString(),
      message: mapMessage(pinned.message),
    };
  }

  private async assertMember(userId: string, conversationId: string) {
    const ok = await this.conversations.ensureMember(userId, conversationId);
    if (!ok) throw new NotFoundException('Conversation not found');
  }

  private async findMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  private async touchConversation(conversationId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }
}
