import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import {
  EditMessageDto,
  ListMessagesQuery,
  PinMessageDto,
  SendImageDto,
  SendTextDto,
} from './messages.dto';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import type { Message, PinnedMessage } from '@messenger/shared';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations/:id/messages')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQuery,
  ): Promise<Message[]> {
    return this.messages.list(user.sub, id, query.before, query.limit ?? 50);
  }

  @Post('conversations/:id/messages/text')
  async sendText(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendTextDto,
  ): Promise<Message> {
    return this.messages.sendText(user.sub, id, dto.content);
  }

  @Post('conversations/:id/messages/image')
  async sendImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendImageDto,
  ): Promise<Message> {
    return this.messages.sendImage(user.sub, id, dto.imageUrl, {
      width: dto.width,
      height: dto.height,
      size: dto.size,
    });
  }

  @Patch('messages/:id')
  async edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ): Promise<Message> {
    return this.messages.edit(user.sub, id, dto.content);
  }

  @Delete('messages/:id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Message> {
    return this.messages.remove(user.sub, id);
  }

  @Post('conversations/:id/pin')
  async pin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PinMessageDto,
  ): Promise<PinnedMessage> {
    return this.messages.pin(user.sub, id, dto.messageId);
  }

  @Delete('conversations/:id/pin')
  @HttpCode(HttpStatus.OK)
  async unpin(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.unpin(user.sub, id);
  }

  @Get('conversations/:id/pin')
  async getPinned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PinnedMessage | null> {
    return this.messages.getPinned(user.sub, id);
  }
}
