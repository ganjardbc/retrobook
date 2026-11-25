import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CreateEventDto, EventRangeDto, RsvpDto } from './dto/event.dto'
import { EventsService } from './events.service'

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: EventRangeDto) {
    return this.events.list(user.id, q.from, q.to)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.get(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(user.id, dto)
  }

  @Put(':id/rsvp')
  rsvp(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.events.rsvp(user.id, id, dto.status)
  }
}
