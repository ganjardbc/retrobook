import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'
import { MESSAGE_PER_USER, RateLimit } from '../../common/rate-limit'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { SendMessageDto } from './dto/messages.dto'
import { MessagesService } from './messages.service'

@Controller('chat')
export class ChatController {
  constructor(private readonly messages: MessagesService) {}

  @Get('friends')
  friends(@CurrentUser() user: AuthUser) {
    return this.messages.chatFriends(user.id)
  }
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Rute tetap harus di atas `:userId` supaya tidak dianggap id.
  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.messages.conversations(user.id, q.limit, q.cursor)
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messages.unreadCount(user.id)
  }

  @Get(':userId')
  history(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() q: CursorQueryDto,
  ) {
    return this.messages.history(user.id, userId, q.limit, q.cursor)
  }

  /** REST cadangan bila socket putus. 201 pesan baru; 200 bila `clientId` sudah pernah dikirim. */
  @Post(':userId')
  @RateLimit(MESSAGE_PER_USER)
  async send(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SendMessageDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { message, duplicate } = await this.messages.send(
      user.id,
      userId,
      dto.content,
      dto.clientId,
    )
    res.status(duplicate ? 200 : 201)
    return message
  }

  @Post(':userId/read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Param('userId', ParseIntPipe) userId: number) {
    return this.messages.markRead(user.id, userId)
  }
}
