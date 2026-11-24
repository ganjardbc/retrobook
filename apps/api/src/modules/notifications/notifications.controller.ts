import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { MarkReadDto } from './dto/notifications.dto'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.notifications.list(user.id, q.limit, q.cursor)
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id)
  }

  @Post('read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Body() body: MarkReadDto) {
    return this.notifications.markRead(user.id, body.ids)
  }
}
