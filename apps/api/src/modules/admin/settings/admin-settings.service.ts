import { Injectable } from '@nestjs/common'
import { AppException } from '../../../common/app-exception'
import { SettingsService, type SystemSettings } from '../../settings/settings.service'
import { AdminAuditService } from '../admin-audit.service'
import type { UpdateAdminSettingsDto } from './admin-settings.dto'

const KEYS = { maintenanceMode: 'maintenance_mode', registrationOpen: 'registration_open' } as const

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AdminAuditService,
  ) {}

  /** ADM-12: ubah pengaturan dan catat audit dalam satu transaksi; berlaku di request berikutnya. */
  async update(adminId: number, dto: UpdateAdminSettingsDto, ip?: string): Promise<SystemSettings> {
    const changes = (Object.keys(KEYS) as (keyof typeof KEYS)[]).filter((k) => dto[k] !== undefined)
    if (!changes.length)
      throw new AppException(400, 'VALIDATION_FAILED', 'Tidak ada pengaturan yang diubah')
    await this.audit.execute(
      {
        adminId,
        action: 'SETTINGS_UPDATE',
        targetType: 'SETTING',
        detail: Object.fromEntries(changes.map((k) => [KEYS[k], dto[k]!])),
        ip,
      },
      async (tx) => {
        for (const k of changes) {
          await tx.setting.upsert({
            where: { key: KEYS[k] },
            create: { key: KEYS[k], value: dto[k]!, updatedBy: adminId },
            update: { value: dto[k]!, updatedBy: adminId },
          })
        }
      },
    )
    return this.settings.get()
  }
}
