import { Module } from '@nestjs/common'
import { NotesController, ProfileNotesController } from './notes.controller'
import { NotesService } from './notes.service'

@Module({ controllers: [NotesController, ProfileNotesController], providers: [NotesService] })
export class NotesModule {}
