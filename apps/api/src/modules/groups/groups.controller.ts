import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { CreateGroupDto, CreateGroupPostDto } from './dto/group.dto'
import { GroupsService } from './groups.service'

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.groups.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.groups.get(user.id, id)
  }

  @Post(':id/join')
  join(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.groups.join(user.id, id)
  }

  @Post(':id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.groups.leave(user.id, id)
  }

  @Get(':id/posts')
  posts(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: CursorQueryDto,
  ) {
    return this.groups.posts(user.id, id, q.limit, q.cursor)
  }

  @Post(':id/posts')
  createPost(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateGroupPostDto,
  ) {
    return this.groups.createPost(user.id, id, dto)
  }
}
