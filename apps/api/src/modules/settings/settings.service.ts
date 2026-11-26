import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export type SystemSettings = { maintenanceMode: boolean; registrationOpen: boolean }

const TTL_MS = 5_000

/**
 * ADM-12: pengaturan sistem dibaca dari DB, di-cache 5 detik di memori (guard memanggilnya tiap request).
 * `invalidate()` dipanggil saat admin mengubah pengaturan, jadi perubahan terasa langsung di instance ini.
 */
@Injectable()
export class SettingsService {
  private cache?: { at: number; value: SystemSettings }

  constructor(private readonly prisma: PrismaService) {}

  invalidate() {
    this.cache = undefined
  }

  async get(): Promise<SystemSettings> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.value
    const value = await this.load()
    this.cache = { at: Date.now(), value }
    return value
  }

  private async load(): Promise<SystemSettings> {
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
