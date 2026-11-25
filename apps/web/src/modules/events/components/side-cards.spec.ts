import type { GroupSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import EventsTodayCard from '@/modules/events/components/EventsTodayCard.vue'
import SuggestedGroupsCard from '@/modules/groups/components/SuggestedGroupsCard.vue'
import { eventsApi } from '@/modules/events/services/api'
import { groupsApi } from '@/modules/groups/services/api'

vi.mock('@/modules/events/services/api', () => ({ eventsApi: { list: vi.fn() } }))
vi.mock('@/modules/groups/services/api', () => ({ groupsApi: { list: vi.fn(), join: vi.fn() } }))

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })
const group = (id: string, name: string): GroupSummary => ({
  id,
  name,
  description: '',
  privacy: 'PUBLIC',
  createdBy: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberCount: 4,
  isMember: false,
  avatarUrl: null,
  isAdmin: false,
})

beforeEach(() => vi.resetAllMocks())

describe('EventsTodayCard', () => {
  it('tampil dengan tautan ke detail; tersembunyi bila kosong atau gagal', async () => {
    vi.mocked(eventsApi.list).mockResolvedValueOnce({
      items: [
        {
          id: '7',
          title: 'Kopdar',
          description: '',
          location: '',
          startsAt: new Date().toISOString(),
          myRsvp: null,
          rsvpCount: 0,
        },
      ],
    })
    const w = mount(EventsTodayCard, { global: { plugins: [router()] } })
    await flushPromises()
    expect(w.text()).toContain('Events today')
    expect(w.find('a').attributes('href')).toBe('/events/7')

    vi.mocked(eventsApi.list).mockRejectedValueOnce(new Error('x'))
    const failed = mount(EventsTodayCard, { global: { plugins: [router()] } })
    await flushPromises()
    expect(failed.find('section').exists()).toBe(false)
  })
})

describe('SuggestedGroupsCard', () => {
  it('Join memanggil API lalu menghapus grup dari kartu', async () => {
    vi.mocked(groupsApi.list).mockResolvedValueOnce({
      items: [],
      suggested: [group('1', 'Klub A'), group('2', 'Klub B')],
    })
    vi.mocked(groupsApi.join).mockResolvedValueOnce({ ...group('1', 'Klub A'), isMember: true })
    const w = mount(SuggestedGroupsCard, { global: { plugins: [router()] } })
    await flushPromises()
    expect(w.findAll('li')).toHaveLength(2)
    await w.find('button').trigger('click')
    await flushPromises()
    expect(groupsApi.join).toHaveBeenCalledWith('1')
    expect(w.findAll('li')).toHaveLength(1)
  })
})
