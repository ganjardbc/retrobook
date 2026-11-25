import type {
  ChatFriend,
  FriendActivity,
  ChatMessage,
  Conversation,
  Paged,
} from '@retrobook/shared'
import { request } from '@/plugins/http'

const page = (cursor?: string | null, limit = 20) =>
  `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`

export const chatApi = {
  /** Ticker aktivitas teman (post, komentar, like), terbaru dulu. */
  activity: () => request<{ items: FriendActivity[] }>('/activity/friends?limit=5'),
  friends: () => request<{ items: ChatFriend[] }>('/chat/friends'),
  conversations: (cursor?: string | null) =>
    request<Paged<Conversation>>(`/messages/conversations${page(cursor, 10)}`),
  /** Terbaru dulu; `cursor` menuju pesan yang lebih lama. */
  history: (userId: string, cursor?: string | null) =>
    request<Paged<ChatMessage>>(`/messages/${userId}${page(cursor)}`),
  /** REST cadangan bila socket putus; `clientId` yang sama aman diulang. */
  send: (userId: string, content: string, clientId: string) =>
    request<ChatMessage>(`/messages/${userId}`, { method: 'POST', body: { content, clientId } }),
  /** Clear chat: sembunyikan riwayat dari saya saja. */
  clear: (userId: string) => request<void>(`/messages/${userId}/history`, { method: 'DELETE' }),
  /** Hapus sesi: seperti clear, dan hilang dari daftar Messages sampai ada pesan baru. */
  remove: (userId: string) => request<void>(`/messages/${userId}`, { method: 'DELETE' }),
  read: (userId: string) =>
    request<{ updated: number }>(`/messages/${userId}/read`, { method: 'POST' }),
}
