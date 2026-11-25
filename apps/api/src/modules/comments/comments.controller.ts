import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/comment.dto'

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('posts/:id/comments')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: CursorQueryDto,
  ) {
    return this.comments.list(user.id, id, q.limit, q.cursor)
  }

  @Post('posts/:id/comments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user.id, id, dto)
  }

  @Delete('comments/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.comments.remove(user.id, id)
  }
}
