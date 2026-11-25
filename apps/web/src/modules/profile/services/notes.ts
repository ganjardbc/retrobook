import { request } from '@/plugins/http'

export type NoteItem = {
  id: string
  authorId: string
  title: string
  body: string
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  createdAt: string
}
type NoteInput = Pick<NoteItem, 'title' | 'body' | 'privacy'>

export const notesApi = {
  forProfile: (username: string) =>
    request<{ items: NoteItem[] }>(`/users/${encodeURIComponent(username)}/notes`),
  create: (input: NoteInput) => request<NoteItem>('/notes', { method: 'POST', body: input }),
  update: (id: string, input: Partial<NoteInput>) =>
    request<NoteItem>(`/notes/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
}
