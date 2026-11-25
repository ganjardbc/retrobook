import { adminHttp } from '@/plugins/admin-http'

export type Sponsored = { id: number; title: string; body: string; imageUrl: string | null; linkUrl: string; active: boolean; startsAt: string | null; endsAt: string | null }
export type SponsoredInput = { title: string; body: string; linkUrl: string; startsAt?: string | null; endsAt?: string | null }
export const adminSponsoredApi = {
  list: () => adminHttp.get<{ items: Sponsored[] }>('/admin/sponsored'),
  create: (body: SponsoredInput) => adminHttp.post<Sponsored>('/admin/sponsored', body),
  update: (id: number, body: Partial<SponsoredInput> & { active?: boolean }) => adminHttp.patch<Sponsored>(`/admin/sponsored/${id}`, body),
  remove: (id: number) => adminHttp.delete<{ id: number }>(`/admin/sponsored/${id}`),
}
