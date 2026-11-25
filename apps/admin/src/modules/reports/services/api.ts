import { adminHttp } from '@/plugins/admin-http'
import type { ReportAction, ReportsPage, ReportStatus } from './types'

export const adminReportsApi = {
  list: (status: ReportStatus | '', cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '20' })
    if (status) params.set('status', status)
    if (cursor) params.set('cursor', String(cursor))
    return adminHttp.get<ReportsPage>(`/admin/reports?${params}`)
  },
  decide: (id: string, status: 'REVIEWED' | 'DISMISSED', action?: ReportAction, note?: string) =>
    adminHttp.patch<{ id: string; status: string }>(`/admin/reports/${id}`, {
      status,
      action,
      note: note || undefined,
    }),
}
