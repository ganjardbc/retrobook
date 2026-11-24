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
import {
  BirthdaysQueryDto,
  FriendsQueryDto,
  SendRequestDto,
  SuggestionsQueryDto,
} from './dto/friends.dto'
import { FriendDiscoveryService } from './discovery.service'
import { FriendsService } from './friends.service'

@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friends: FriendsService,
    private readonly discovery: FriendDiscoveryService,
  ) {}

  @Post('requests')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendRequestDto) {
    return this.friends.sendRequest(user.id, dto.userId)
  }

  @Get('requests')
  incoming(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.friends.incoming(user.id, q.limit, q.cursor)
  }

  @Post('requests/:userId/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('userId', ParseIntPipe) userId: number) {
    return this.friends.accept(user.id, userId)
  }

  @Delete('requests/:userId')
  @HttpCode(204)
  async cancelOrReject(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.friends.cancelOrReject(user.id, userId)
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: FriendsQueryDto) {
    return this.friends.list(user.id, q.limit, q.cursor, q.q)
  }

  @Get('suggestions')
  suggestions(@CurrentUser() user: AuthUser, @Query() q: SuggestionsQueryDto) {
    return this.discovery.suggestions(user.id, q.limit)
  }

  @Get('birthdays')
  birthdays(@CurrentUser() user: AuthUser, @Query() q: BirthdaysQueryDto) {
    return this.discovery.birthdays(user.id, q.date)
  }

  @Delete(':userId')
  @HttpCode(204)
  async unfriend(@CurrentUser() user: AuthUser, @Param('userId', ParseIntPipe) userId: number) {
    await this.friends.unfriend(user.id, userId)
  }
}
