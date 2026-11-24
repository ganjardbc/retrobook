import { dashboardApi } from '@/modules/dashboard/services/api'
import type { DashboardStats } from '@/modules/dashboard/services/types'

type DashboardStoreContext = {
  loading: boolean
  error: string
  stats: DashboardStats | null
}

export const actions = {
  async fetchStats(this: DashboardStoreContext) {
    this.loading = true
    this.error = ''
    try { this.stats = await dashboardApi.getStats() }
    catch (error) { this.error = error instanceof Error ? error.message : 'Gagal memuat dashboard.' }
    finally { this.loading = false }
  },
}
