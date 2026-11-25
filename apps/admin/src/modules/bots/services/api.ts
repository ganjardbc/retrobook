import { adminHttp } from '@/plugins/admin-http'

export type Bot = {
  userId: number
  persona: string
  postsPerDay: number
  active: boolean
  lastPostAt: string | null
  user: { username: string; displayName: string }
}
export const adminBotsApi = {
  list: () => adminHttp.get<{ items: Bot[] }>('/admin/bots'),
  create: (body: { username: string; displayName: string; persona: string; postsPerDay: number }) =>
    adminHttp.post<Bot>('/admin/bots', body),
  update: (id: number, body: Partial<Pick<Bot, 'active' | 'persona' | 'postsPerDay'>>) =>
    adminHttp.patch<Bot>(`/admin/bots/${id}`, body),
}
