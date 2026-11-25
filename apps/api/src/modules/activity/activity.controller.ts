import { Controller, Get, Query } from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { ActivityService } from './activity.service'

class ActivityQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20

  @IsOptional()
  @IsDateString()
  cursor?: string
}

class FriendsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit = 15
}

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  /** Aktivitas teman untuk sidebar chat; tanpa kursor, cukup yang terbaru. */
  @Get('friends')
  friends(@CurrentUser() user: AuthUser, @Query() q: FriendsQuery) {
    return this.activity.friends(user.id, q.limit).then((items) => ({ items }))
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ActivityQuery) {
    return this.activity.list(user.id, q.limit, q.cursor)
  }
}
