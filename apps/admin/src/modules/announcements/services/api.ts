import { adminHttp } from '@/plugins/admin-http'

export type Announcement = {
  id: string
  title: string
  body: string
  active: boolean
  createdAt: string
}
export const adminAnnouncementsApi = {
  list: () => adminHttp.get<{ items: Announcement[] }>('/admin/announcements'),
  create: (title: string, body: string) =>
    adminHttp.post<Announcement & { notified: number }>('/admin/announcements', { title, body }),
  setActive: (id: string, active: boolean) =>
    adminHttp.patch<Announcement>(`/admin/announcements/${id}`, { active }),
  remove: (id: string) => adminHttp.delete<{ id: string }>(`/admin/announcements/${id}`),
}
