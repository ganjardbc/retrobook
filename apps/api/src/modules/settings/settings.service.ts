import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type SystemSettings = { maintenanceMode: boolean; registrationOpen: boolean }

/** ADM-12: pengaturan sistem dibaca dari DB tiap request supaya perubahan berlaku tanpa deploy ulang. */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SystemSettings> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['maintenance_mode', 'registration_open'] } },
    })
    const value = (key: string, fallback: boolean) => {
      const raw = rows.find((r) => r.key === key)?.value
      return typeof raw === 'boolean' ? raw : fallback
    }
    return {
      maintenanceMode: value('maintenance_mode', false),
      registrationOpen: value('registration_open', true),
    }
  }
}
