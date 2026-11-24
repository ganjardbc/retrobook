import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminDashboardService } from './admin-dashboard.service'
import { DashboardSeriesQuery } from './dashboard.dto'

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboard.stats()
  }

  @Get('stats/series')
  series(@Query() query: DashboardSeriesQuery) {
    return this.dashboard.series(query.days)
  }
}
