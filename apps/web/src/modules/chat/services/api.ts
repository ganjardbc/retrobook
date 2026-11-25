import type {
  ChatFriend,
  FriendActivity,
  ChatMessage,
  Conversation,
  Paged,
} from '@retrobook/shared'
import { request } from '@/plugins/http'

const page = (cursor?: number | null, limit = 20) =>
  `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`

export const chatApi = {
  /** Ticker aktivitas teman (post, komentar, like), terbaru dulu. */
  activity: () => request<{ items: FriendActivity[] }>('/activity/friends?limit=5'),
  friends: () => request<{ items: ChatFriend[] }>('/chat/friends'),
  conversations: (cursor?: number | null) =>
    request<Paged<Conversation>>(`/messages/conversations${page(cursor, 10)}`),
  /** Terbaru dulu; `cursor` menuju pesan yang lebih lama. */
  history: (userId: number, cursor?: number | null) =>
    request<Paged<ChatMessage>>(`/messages/${userId}${page(cursor)}`),
  /** REST cadangan bila socket putus; `clientId` yang sama aman diulang. */
  send: (userId: number, content: string, clientId: string) =>
    request<ChatMessage>(`/messages/${userId}`, { method: 'POST', body: { content, clientId } }),
  /** Clear chat: sembunyikan riwayat dari saya saja. */
  clear: (userId: number) => request<void>(`/messages/${userId}/history`, { method: 'DELETE' }),
  /** Hapus sesi: seperti clear, dan hilang dari daftar Messages sampai ada pesan baru. */
  remove: (userId: number) => request<void>(`/messages/${userId}`, { method: 'DELETE' }),
  read: (userId: number) =>
    request<{ updated: number }>(`/messages/${userId}/read`, { method: 'POST' }),
}
