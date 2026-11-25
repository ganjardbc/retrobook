import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminHashtagsQuery, SetHashtagHiddenDto } from './admin-hashtags.dto'
import { AdminHashtagsService } from './admin-hashtags.service'

@Controller('admin/hashtags')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminHashtagsController {
  constructor(private readonly hashtags: AdminHashtagsService) {}

  @Get()
  list(@Query() query: AdminHashtagsQuery) { return this.hashtags.list(query) }

  @Patch(':id')
  setHidden(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SetHashtagHiddenDto, @Req() request: Request) {
    return this.hashtags.setHidden(admin.id, id, dto.hidden, request.ip)
  }
}
