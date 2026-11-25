import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { CreateBlockedWordDto } from './admin-blocked-words.dto'
import { AdminBlockedWordsService } from './admin-blocked-words.service'

@Controller('admin/blocked-words')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminBlockedWordsController {
  constructor(private readonly words: AdminBlockedWordsService) {}

  @Get()
  list() { return this.words.list() }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateBlockedWordDto, @Req() request: Request) {
    return this.words.create(admin.id, dto.word, request.ip)
  }

  @Delete(':id')
  remove(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.words.remove(admin.id, id, request.ip)
  }
}
