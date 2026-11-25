import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminReportsService } from './admin-reports.service'
import { AdminReportsQuery, DecideReportDto } from './admin-reports.dto'

@Controller('admin/reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get()
  list(@Query() query: AdminReportsQuery) {
    return this.reports.list(query)
  }

  @Patch(':id')
  decide(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideReportDto,
    @Req() request: Request,
  ) {
    return this.reports.decide(admin.id, id, dto, request.ip)
  }
}
