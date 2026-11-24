import { Controller, Get, Param, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { FriendsQueryDto } from '../friends/dto/friends.dto'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':username')
  profile(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.users.getProfile(user.id, username)
  }

  @Get(':username/posts')
  timeline(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() q: CursorQueryDto,
  ) {
    return this.users.timeline(user.id, username, q.limit, q.cursor)
  }

  @Get(':username/friends')
  friends(@Param('username') username: string, @Query() q: FriendsQueryDto) {
    return this.users.friendsOf(username, q.limit, q.cursor, q.q)
  }

  @Get(':username/photos')
  photos(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
    @Query() q: CursorQueryDto,
  ) {
    return this.users.photos(user.id, username, q.limit, q.cursor)
  }
}
