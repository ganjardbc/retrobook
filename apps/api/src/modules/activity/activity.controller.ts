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

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ActivityQuery) {
    return this.activity.list(user.id, q.limit, q.cursor)
  }
}
