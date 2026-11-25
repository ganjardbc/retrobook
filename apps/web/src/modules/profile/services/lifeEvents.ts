import { request } from '@/plugins/http'

export type LifeEventKind = 'MOVED' | 'STARTED_JOB' | 'GRADUATED' | 'OTHER'
export type LifeEvent = {
  id: number
  userId: number
  kind: LifeEventKind
  title: string
  happenedOn: string
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  createdAt: string
}

export const lifeEventsApi = {
  forProfile: (username: string) =>
    request<{ items: LifeEvent[] }>(`/users/${encodeURIComponent(username)}/life-events`),
  create: (input: Pick<LifeEvent, 'kind' | 'title' | 'happenedOn' | 'privacy'>) =>
    request<LifeEvent>('/life-events', { method: 'POST', body: input }),
  remove: (id: number) => request<void>(`/life-events/${id}`, { method: 'DELETE' }),
}
