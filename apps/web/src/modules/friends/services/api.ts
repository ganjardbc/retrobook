import type {
  FriendRequest,
  FriendSuggestion,
  FriendsPage,
  FriendshipResult,
  Paged,
  UserSummary,
} from '@retrobook/shared'
import { request } from '@/plugins/http'

const qs = (cursor?: string | null, extra = '') =>
  `?limit=10${cursor ? `&cursor=${cursor}` : ''}${extra}`

export const friendsApi = {
  /** People You May Know (FRD-05). */
  suggestions: (limit = 5) =>
    request<{ items: FriendSuggestion[] }>(`/friends/suggestions?limit=${limit}`),
  /** Teman yang berulang tahun pada `date` (YYYY-MM-DD, tanggal lokal pengguna; FRD-07). */
  birthdays: (date: string) => request<{ items: UserSummary[] }>(`/friends/birthdays?date=${date}`),
  requests: (cursor?: string | null) =>
    request<Paged<FriendRequest>>(`/friends/requests${qs(cursor)}`),
  list: (cursor?: string | null, q = '') =>
    request<FriendsPage>(`/friends${qs(cursor, q ? `&q=${encodeURIComponent(q)}` : '')}`),
  send: (userId: string) =>
    request<FriendshipResult>('/friends/requests', { method: 'POST', body: { userId } }),
  accept: (userId: string) =>
    request<FriendshipResult>(`/friends/requests/${userId}/accept`, { method: 'POST' }),
  reject: (userId: string) => request<void>(`/friends/requests/${userId}`, { method: 'DELETE' }),
  unfriend: (userId: string) => request<void>(`/friends/${userId}`, { method: 'DELETE' }),
}
