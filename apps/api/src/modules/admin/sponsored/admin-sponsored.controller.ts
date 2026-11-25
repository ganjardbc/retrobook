import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CreateSponsoredDto, UpdateSponsoredDto } from './admin-sponsored.dto'
import { AdminSponsoredService } from './admin-sponsored.service'

@Controller('admin/sponsored')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminSponsoredController {
  constructor(private readonly sponsored: AdminSponsoredService) {}

  @Get()
  list() {
    return this.sponsored.list()
  }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateSponsoredDto, @Req() request: Request) {
    return this.sponsored.create(admin.id, dto, request.ip)
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSponsoredDto,
    @Req() request: Request,
  ) {
    return this.sponsored.update(admin.id, id, dto, request.ip)
  }

  @Delete(':id')
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.sponsored.remove(admin.id, id, request.ip)
  }
}
