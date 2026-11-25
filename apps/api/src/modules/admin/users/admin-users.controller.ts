import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import {
  AdminUsersQuery,
  UpdateAdminUserRoleDto,
  UpdateAdminUserStatusDto,
} from './admin-users.dto'
import { AdminUsersService } from './admin-users.service'

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: AdminUsersQuery) {
    return this.users.list(query)
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.detail(id)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserStatusDto,
    @Req() request: Request,
  ) {
    return this.users.updateStatus(admin.id, id, dto, request.ip)
  }

  @Patch(':id/role')
  updateRole(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserRoleDto,
    @Req() request: Request,
  ) {
    return this.users.updateRole(admin.id, id, dto, request.ip)
  }

  @Post(':id/reset-password')
  resetPassword(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.users.resetPassword(admin.id, id, request.ip)
  }

  @Delete(':id')
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.users.delete(admin.id, id, request.ip)
  }
}
