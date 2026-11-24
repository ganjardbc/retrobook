import type { DashboardStats } from './types'
import { adminSession } from '@/helpers/session'

const BASE = import.meta.env.VITE_API_URL ?? '/api'
type DashboardSummary = Omit<DashboardStats, 'registrationsByDay' | 'postsByDay'>
type DashboardSeries = Pick<DashboardStats, 'registrationsByDay' | 'postsByDay'>

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${adminSession.accessToken ?? ''}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.message
    throw new Error(Array.isArray(message) ? message.join(' ') : message ?? 'Gagal memuat statistik dashboard.')
  }
  return response.json() as Promise<T>
}

export const dashboardApi = {
  getStats: async () => {
    const [summary, series] = await Promise.all([
      get<DashboardSummary>('/admin/stats'),
      get<DashboardSeries>('/admin/stats/series?days=7'),
    ])
    return { ...summary, ...series }
  },
}
