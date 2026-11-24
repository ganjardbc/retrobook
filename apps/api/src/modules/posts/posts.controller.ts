import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CreatePostDto, CursorQueryDto, SharePostDto, UpdatePostDto } from './dto/post.dto'
import { PostsService } from './posts.service'

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.id, dto)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.posts.get(user.id, id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(user.id, id, dto)
  }

  @Post(':id/share')
  share(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SharePostDto,
  ) {
    return this.posts.share(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.posts.remove(user.id, id)
  }
}

@Controller('feed')
export class FeedController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  feed(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.posts.feed(user.id, q.limit, q.cursor)
  }
}
