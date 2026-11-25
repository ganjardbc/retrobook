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
import { AdminBlockedWordsController } from './blocked-words/admin-blocked-words.controller'
import { AdminBlockedWordsService } from './blocked-words/admin-blocked-words.service'
import { AdminSettingsController } from './settings/admin-settings.controller'
import { AdminSettingsService } from './settings/admin-settings.service'
import { SettingsModule } from '../settings/settings.module'
import { AdminAnnouncementsController } from './announcements/admin-announcements.controller'
import { AdminAnnouncementsService } from './announcements/admin-announcements.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { AdminAuditLogsController } from './audit-logs/admin-audit-logs.controller'
import { AdminAuditLogsService } from './audit-logs/admin-audit-logs.service'
import { AdminBotsController } from './bots/admin-bots.controller'
import { AdminBotsService } from './bots/admin-bots.service'

@Module({
  imports: [AuthModule, SettingsModule, NotificationsModule],
  controllers: [AdminAuthController, AdminDashboardController, AdminUsersController, AdminModerationController, AdminReportsController, AdminBlockedWordsController, AdminSettingsController, AdminAnnouncementsController, AdminAuditLogsController, AdminBotsController],
  providers: [AdminAuditService, AdminDashboardService, AdminUsersService, AdminModerationService, AdminReportsService, AdminBlockedWordsService, AdminSettingsService, AdminAnnouncementsService, AdminAuditLogsService, AdminBotsService, RolesGuard],
  exports: [AdminAuditService],
})
export class AdminModule {}
