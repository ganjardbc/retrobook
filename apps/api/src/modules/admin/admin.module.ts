import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminAuthController } from './admin-auth.controller'
import { AdminAuditService } from './admin-audit.service'
import { AdminUsersController } from './users/admin-users.controller'
import { AdminUsersService } from './users/admin-users.service'
import { AdminDashboardController } from './dashboard/admin-dashboard.controller'
import { AdminDashboardService } from './dashboard/admin-dashboard.service'
import { RolesGuard } from './roles.guard'
import { AdminModerationController } from './moderation/admin-moderation.controller'
import { AdminModerationService } from './moderation/admin-moderation.service'
import { AdminReportsController } from './reports/admin-reports.controller'
import { AdminReportsService } from './reports/admin-reports.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController, AdminDashboardController, AdminUsersController, AdminModerationController, AdminReportsController],
  providers: [AdminAuditService, AdminDashboardService, AdminUsersService, AdminModerationService, AdminReportsService, RolesGuard],
  exports: [AdminAuditService],
})
export class AdminModule {}
