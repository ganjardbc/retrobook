import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CreateEventDto, RsvpDto } from './dto/event.dto'
import { EventsService } from './events.service'

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.events.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(user.id, dto)
  }

  @Put(':id/rsvp')
  rsvp(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RsvpDto) {
    return this.events.rsvp(user.id, id, dto.status)
  }
}
