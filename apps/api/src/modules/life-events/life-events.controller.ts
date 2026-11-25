import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CreateLifeEventDto } from './dto/life-event.dto'
import { LifeEventsService } from './life-events.service'

@Controller('life-events')
export class LifeEventsController {
  constructor(private readonly events: LifeEventsService) {}
  @Get() async list(@CurrentUser() user: AuthUser) {
    return { items: await this.events.listMine(user.id) }
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateLifeEventDto) {
    return this.events.create(user.id, dto)
  }
  @Delete(':id') @HttpCode(204) async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.events.remove(user.id, id)
  }
}

@Controller('users')
export class ProfileLifeEventsController {
  constructor(private readonly events: LifeEventsService) {}
  @Get(':username/life-events') async list(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ) {
    return { items: await this.events.listProfile(user.id, username) }
  }
}
