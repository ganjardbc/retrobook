import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'
import { AuthService } from '../auth/auth.service'
import { LoginDto, RefreshDto } from '../auth/dto/auth.dto'
import { AdminAuditService } from './admin-audit.service'
import { RolesGuard } from './roles.guard'
import { Roles } from './roles.decorator'

@Controller('admin/auth')
@UseGuards(RolesGuard)
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AdminAuditService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto, Role.ADMIN)
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken, Role.ADMIN)
  }

  @Roles(Role.ADMIN)
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshDto, @Req() request: Request) {
    await this.audit.execute(
      {
        adminId: user.id,
        action: 'ADMIN_LOGOUT',
        targetType: 'USER',
        targetId: user.id,
        detail: { scope: 'current_session' },
        ip: request.ip,
      },
      (tx) => this.auth.logout(user.id, dto.refreshToken, tx),
    )
  }
}
