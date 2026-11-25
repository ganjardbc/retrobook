import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminAuditLogsQuery } from './admin-audit-logs.dto'
import { AdminAuditLogsService } from './admin-audit-logs.service'

/** ADM-14: hanya baca. Sengaja tanpa handler PATCH, PUT, atau DELETE. */
@Controller('admin/audit-logs')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminAuditLogsController {
  constructor(private readonly logs: AdminAuditLogsService) {}

  @Get()
  list(@Query() query: AdminAuditLogsQuery) { return this.logs.list(query) }
}
