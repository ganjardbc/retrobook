import type { DashboardStats } from './types'
import { adminSession } from '@/helpers/session'

const BASE = import.meta.env.VITE_API_URL ?? '/api'
export const dashboardApi = {
  getStats: async () => {
    const response = await fetch(`${BASE}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminSession.accessToken ?? ''}` },
    })
    if (!response.ok) throw new Error('Gagal memuat statistik dashboard.')
    return response.json() as Promise<DashboardStats>
  },
}
