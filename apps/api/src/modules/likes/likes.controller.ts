import { Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Put, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { LikesService } from './likes.service'

@Controller('posts/:id')
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Put('like')
  @HttpCode(200)
  like(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.likes.like(user.id, id)
  }

  @Delete('like')
  @HttpCode(200)
  unlike(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.likes.unlike(user.id, id)
  }

  @Get('likes')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: CursorQueryDto,
  ) {
    return this.likes.list(user.id, id, q.limit, q.cursor)
  }
}
