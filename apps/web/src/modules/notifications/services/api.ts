import type { AppNotification, Paged } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const notificationsApi = {
  list: (cursor?: number | null, limit = 10) =>
    request<Paged<AppNotification>>(
      `/notifications?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  /** Tanpa `ids`: semua. Mengembalikan sisa belum dibaca. */
  markRead: (ids?: number[]) =>
    request<{ count: number }>('/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
}
