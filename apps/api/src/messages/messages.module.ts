import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [RealtimeModule, ConversationsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
