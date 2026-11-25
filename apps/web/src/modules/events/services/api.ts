import { request } from '@/plugins/http'

export type RsvpStatus = 'GOING' | 'MAYBE' | 'DECLINED'
export type EventItem = {
  id: string
  title: string
  description: string
  location: string
  startsAt: string
  myRsvp: RsvpStatus | null
  rsvpCount: number
}

export const eventsApi = {
  list: (range?: { from: string; to: string }) =>
    request<{ items: EventItem[] }>(
      range
        ? `/events?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
        : '/events',
    ),
  get: (id: string) => request<EventItem>(`/events/${id}`),
  create: (input: { title: string; description: string; location: string; startsAt: string }) =>
    request<EventItem>('/events', { method: 'POST', body: input }),
  rsvp: (id: string, status: RsvpStatus) =>
    request<{ eventId: string; status: RsvpStatus; rsvpCount: number }>(`/events/${id}/rsvp`, {
      method: 'PUT',
      body: { status },
    }),
}
