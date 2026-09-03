import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateDirectDto } from './conversations.dto';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import type { Conversation } from '@messenger/shared';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<Conversation[]> {
    return this.conversations.list(user.sub);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Conversation> {
    return this.conversations.get(user.sub, id);
  }

  @Post('direct')
  async createDirect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDirectDto,
  ): Promise<Conversation> {
    return this.conversations.createDirect(user.sub, dto.username);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.conversations.markRead(user.sub, id);
  }
}
