import { adminHttp } from '@/plugins/admin-http'

export type AuditLog = {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  detail: unknown
  ip: string | null
  createdAt: string
  admin: { id: string; username: string; displayName: string }
}
export type AuditFilters = { adminId: string; action: string; from: string; to: string }
export const adminAuditLogsApi = {
  list: (f: AuditFilters, cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '25' })
    if (f.adminId) params.set('adminId', f.adminId)
    if (f.action.trim()) params.set('action', f.action.trim())
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    if (cursor) params.set('cursor', String(cursor))
    return adminHttp.get<{ items: AuditLog[]; total: number; nextCursor: string | null }>(
      `/admin/audit-logs?${params}`,
    )
  },
}
