import {
  Body,
  Controller,
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
import { CreateBotDto, UpdateBotDto } from './admin-bots.dto'
import { AdminBotsService } from './admin-bots.service'

@Controller('admin/bots')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminBotsController {
  constructor(private readonly bots: AdminBotsService) {}

  @Get()
  list() {
    return this.bots.list()
  }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateBotDto, @Req() request: Request) {
    return this.bots.create(admin.id, dto, request.ip)
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBotDto,
    @Req() request: Request,
  ) {
    return this.bots.update(admin.id, id, dto, request.ip)
  }
}
