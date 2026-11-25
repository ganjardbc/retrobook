import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './admin-announcements.dto'
import { AdminAnnouncementsService } from './admin-announcements.service'

@Controller('admin/announcements')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AdminAnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.list()
  }

  @Post()
  create(
    @CurrentUser() admin: AuthUser,
    @Body() dto: CreateAnnouncementDto,
    @Req() request: Request,
  ) {
    return this.announcements.create(admin.id, dto, request.ip)
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() request: Request,
  ) {
    return this.announcements.update(admin.id, id, dto, request.ip)
  }

  @Delete(':id')
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.announcements.remove(admin.id, id, request.ip)
  }
}
