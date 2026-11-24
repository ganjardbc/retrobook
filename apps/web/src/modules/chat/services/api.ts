import type { ChatFriend, ChatMessage, Conversation, Paged } from '@retrobook/shared'
import { request } from '@/plugins/http'

const page = (cursor?: number | null, limit = 20) =>
  `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`

export const chatApi = {
  friends: () => request<{ items: ChatFriend[] }>('/chat/friends'),
  conversations: (cursor?: number | null) =>
    request<Paged<Conversation>>(`/messages/conversations${page(cursor, 10)}`),
  /** Terbaru dulu; `cursor` menuju pesan yang lebih lama. */
  history: (userId: number, cursor?: number | null) =>
    request<Paged<ChatMessage>>(`/messages/${userId}${page(cursor)}`),
  /** REST cadangan bila socket putus; `clientId` yang sama aman diulang. */
  send: (userId: number, content: string, clientId: string) =>
    request<ChatMessage>(`/messages/${userId}`, { method: 'POST', body: { content, clientId } }),
  read: (userId: number) =>
    request<{ updated: number }>(`/messages/${userId}/read`, { method: 'POST' }),
}
