import { request } from '@/plugins/http'

export type RsvpStatus = 'GOING' | 'MAYBE' | 'DECLINED'
export type EventItem = {
  id: number
  title: string
  description: string
  location: string
  startsAt: string
  myRsvp: RsvpStatus | null
  rsvpCount: number
}

export const eventsApi = {
  list: () => request<{ items: EventItem[] }>('/events'),
  create: (input: { title: string; description: string; location: string; startsAt: string }) =>
    request<EventItem>('/events', { method: 'POST', body: input }),
  rsvp: (id: number, status: RsvpStatus) =>
    request<{ eventId: number; status: RsvpStatus; rsvpCount: number }>(`/events/${id}/rsvp`, {
      method: 'PUT',
      body: { status },
    }),
}
