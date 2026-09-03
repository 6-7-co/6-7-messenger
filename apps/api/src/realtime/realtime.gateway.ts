import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/app.config';
import { ClientEvents, Events } from '@messenger/shared';

interface TypingSetPayload {
  conversationId: string;
  isTyping: boolean;
}

interface SubscribePayload {
  conversationIds: string[];
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly clients = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) ?? '';
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.accessSecret,
      });
      const userId = payload.sub;

      const wasOnline = this.isOnline(userId);
      client.data.userId = userId;
      this.addClient(userId, client.id);
      client.join(this.userRoom(userId));

      for (const [otherId, sockets] of this.clients) {
        if (otherId !== userId && sockets.size > 0) {
          client.emit(Events.presence, { userId: otherId, online: true });
        }
      }

      if (!wasOnline) {
        this.server.emit(Events.presence, { userId, online: true });
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;

    this.removeClient(userId, client.id);
    if (!this.isOnline(userId)) {
      this.server.emit(Events.presence, { userId, online: false });
    }
  }

  @SubscribeMessage(ClientEvents.typingSet)
  handleTyping(client: Socket, payload: TypingSetPayload) {
    const userId = client.data?.userId as string | undefined;
    if (!userId || !payload?.conversationId) return;
    this.server.to(this.conversationRoom(payload.conversationId)).emit(Events.typing, {
      conversationId: payload.conversationId,
      userId,
      isTyping: payload.isTyping,
    });
  }

  @SubscribeMessage('conversations:subscribe')
  async handleSubscribe(client: Socket, payload: SubscribePayload) {
    const userId = client.data?.userId as string | undefined;
    if (!userId || !Array.isArray(payload?.conversationIds)) return;

    for (const conversationId of payload.conversationIds) {
      const member = await this.prisma.conversationMember.count({
        where: { conversationId, userId },
      });
      if (member > 0) {
        client.join(this.conversationRoom(conversationId));
      }
    }
  }

  emitMessageNew(conversationId: string, message: unknown) {
    this.server.to(this.conversationRoom(conversationId)).emit(Events.messageNew, message);
  }

  emitMessageUpdated(conversationId: string, message: unknown) {
    this.server.to(this.conversationRoom(conversationId)).emit(Events.messageUpdated, message);
  }

  emitMessageDeleted(conversationId: string, message: unknown) {
    this.server.to(this.conversationRoom(conversationId)).emit(Events.messageDeleted, message);
  }

  emitMessagePinned(conversationId: string, pinned: unknown) {
    this.server.to(this.conversationRoom(conversationId)).emit(Events.messagePinned, pinned);
  }

  emitMessageUnpinned(conversationId: string, payload: unknown) {
    this.server.to(this.conversationRoom(conversationId)).emit(Events.messageUnpinned, payload);
  }

  emitConversationNew(conversationId: string, userIds: string[], conversation: unknown) {
    for (const userId of userIds) {
      this.server.to(this.userRoom(userId)).emit(Events.conversationNew, conversation);
    }
    for (const userId of userIds) {
      this.ensureJoined(userId, conversationId);
    }
  }

  private ensureJoined(userId: string, conversationId: string) {
    const socketIds = this.clients.get(userId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
      this.server.sockets.sockets.get(socketId)?.join(this.conversationRoom(conversationId));
    }
  }

  private addClient(userId: string, socketId: string) {
    const set = this.clients.get(userId) ?? new Set<string>();
    set.add(socketId);
    this.clients.set(userId, set);
  }

  private removeClient(userId: string, socketId: string) {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.clients.delete(userId);
  }

  private isOnline(userId: string): boolean {
    const set = this.clients.get(userId);
    return !!set && set.size > 0;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }
}
