import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto'
import { NotesService } from './notes.service'

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}
  @Get() async list(@CurrentUser() user: AuthUser) {
    return { items: await this.notes.listMine(user.id) }
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateNoteDto) {
    return this.notes.create(user.id, dto)
  }
  @Get(':id') get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notes.get(user.id, id)
  }
  @Patch(':id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(user.id, id, dto)
  }
  @Delete(':id') @HttpCode(204) async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notes.remove(user.id, id)
  }
}

@Controller('users')
export class ProfileNotesController {
  constructor(private readonly notes: NotesService) {}
  @Get(':username/notes') async list(
    @CurrentUser() user: AuthUser,
    @Param('username') username: string,
  ) {
    return { items: await this.notes.listProfile(user.id, username) }
  }
}
