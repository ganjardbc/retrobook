import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { SettingsService } from '../../settings/settings.service'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminSettingsService } from './admin-settings.service'
import { UpdateAdminSettingsDto } from './admin-settings.dto'

@Controller('admin/settings')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly admin: AdminSettingsService,
  ) {}

  @Get()
  get() {
    return this.settings.get()
  }

  @Patch()
  update(
    @CurrentUser() admin: AuthUser,
    @Body() dto: UpdateAdminSettingsDto,
    @Req() request: Request,
  ) {
    return this.admin.update(admin.id, dto, request.ip)
  }
}
