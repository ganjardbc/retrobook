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
  Put,
  Query,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import {
  CreatePostDto,
  CursorQueryDto,
  FeedQueryDto,
  SharePostDto,
  UpdatePostDto,
  YearQueryDto,
} from './dto/post.dto'
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

  @Get(':id/related')
  related(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.posts.related(user.id, id)
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

  @Put(':id/save')
  @HttpCode(200)
  save(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.posts.save(user.id, id)
  }

  @Delete(':id/save')
  @HttpCode(200)
  unsave(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.posts.unsave(user.id, id)
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
  feed(@CurrentUser() user: AuthUser, @Query() q: FeedQueryDto) {
    return this.posts.feed(user.id, q.limit, q.cursor, q.sort)
  }
}

@Controller()
export class SavedController {
  constructor(private readonly posts: PostsService) {}

  @Get('saved')
  saved(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.posts.saved(user.id, q.limit, q.cursor)
  }

  @Get('year-in-review')
  yearInReview(@CurrentUser() user: AuthUser, @Query() q: YearQueryDto) {
    return this.posts.yearInReview(user.id, q.year ?? new Date().getUTCFullYear())
  }

  @Get('on-this-day')
  onThisDay(@CurrentUser() user: AuthUser) {
    return this.posts.onThisDay(user.id)
  }
}

@Controller()
export class HashtagsController {
  constructor(private readonly posts: PostsService) {}

  @Get('trending')
  trending(@CurrentUser() user: AuthUser) {
    return this.posts.trending(user.id)
  }

  @Get('hashtags/:tag/posts')
  byHashtag(@CurrentUser() user: AuthUser, @Param('tag') tag: string, @Query() q: CursorQueryDto) {
    return this.posts.byHashtag(user.id, tag, q.limit, q.cursor)
  }
}
