import { adminHttp } from '@/plugins/admin-http'

export type Announcement = {
  id: number
  title: string
  body: string
  active: boolean
  createdAt: string
}
export const adminAnnouncementsApi = {
  list: () => adminHttp.get<{ items: Announcement[] }>('/admin/announcements'),
  create: (title: string, body: string) =>
    adminHttp.post<Announcement & { notified: number }>('/admin/announcements', { title, body }),
  setActive: (id: number, active: boolean) =>
    adminHttp.patch<Announcement>(`/admin/announcements/${id}`, { active }),
  remove: (id: number) => adminHttp.delete<{ id: number }>(`/admin/announcements/${id}`),
}
