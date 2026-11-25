import { adminHttp } from '@/plugins/admin-http'
import type {
  AdminUser,
  AdminUserDetail,
  AdminUsersPage,
  UserListFilters,
  UserRole,
  UserStatus,
} from './types'

export type AdminUserMutation = AdminUser & { revokedSessions?: number }

export type UserListQuery = {
  q?: string
  status?: UserStatus | ''
  role?: UserRole | ''
  cursor?: string | null
  limit?: number
}

export const adminUsersApi = {
  list: (query: UserListQuery) => {
    const params = new URLSearchParams()
    if (query.q) params.set('q', query.q)
    if (query.status) params.set('status', query.status)
    if (query.role) params.set('role', query.role)
    if (query.cursor) params.set('cursor', String(query.cursor))
    params.set('limit', String(query.limit ?? 20))
    return adminHttp.get<AdminUsersPage>(`/admin/users?${params}`)
  },
  detail: (id: string) => adminHttp.get<AdminUserDetail>(`/admin/users/${id}`),
  updateStatus: (id: string, status: UserStatus, reason: string) =>
    adminHttp.patch<AdminUserMutation>(`/admin/users/${id}/status`, { status, reason }),
  updateRole: (id: string, role: UserRole) =>
    adminHttp.patch<AdminUserMutation>(`/admin/users/${id}/role`, { role }),
  resetPassword: (id: string) =>
    adminHttp.post<{ temporaryPassword: string; revokedSessions: number }>(
      `/admin/users/${id}/reset-password`,
    ),
  remove: (id: string) =>
    adminHttp.delete<{ id: string; deletedAt: string; revokedSessions: number }>(
      `/admin/users/${id}`,
    ),
}

export const emptyUserFilters = (): UserListFilters => ({ status: '', role: '' })
