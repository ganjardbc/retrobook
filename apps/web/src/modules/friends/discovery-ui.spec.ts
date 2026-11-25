import type { FriendSuggestion, UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import BirthdaysCard from '@/modules/friends/components/BirthdaysCard.vue'
import PeopleYouMayKnow from '@/modules/friends/components/PeopleYouMayKnow.vue'
import { friendsApi } from '@/modules/friends/services/api'
import { ApiRequestError } from '@/plugins/http'

vi.mock('@/modules/friends/services/api', () => ({
  friendsApi: { suggestions: vi.fn(), birthdays: vi.fn(), send: vi.fn() },
}))
const api = vi.mocked(friendsApi)

const user = (id: string, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const sug = (id: string, name: string, mutualFriends: number): FriendSuggestion => ({
  user: user(id, name),
  mutualFriends,
})
const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })

beforeEach(() => {
  vi.resetAllMocks()
  api.suggestions.mockResolvedValue({ items: [sug('2', 'Bob', 3), sug('3', 'Carol', 1)] })
  api.send.mockResolvedValue({ userId: '2', status: 'PENDING' })
  api.birthdays.mockResolvedValue({ items: [user('2', 'Bob')] })
})

describe('PeopleYouMayKnow', () => {
  const mountCard = async () => {
    const w = mount(PeopleYouMayKnow, { global: { plugins: [router()] } })
    await flushPromises()
    return w
  }

  it('menampilkan saran dengan jumlah teman bersama (tunggal dan jamak)', async () => {
    const w = await mountCard()
    expect(w.text()).toContain('People You May Know')
    const rows = w.findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.find('.row__name').text()).toBe('Bob')
    expect(rows[0]!.find('.row__meta').text()).toBe('3 mutual friends')
    expect(rows[1]!.find('.row__meta').text()).toBe('1 mutual friend')
    expect(rows[0]!.find('.row__name').attributes('href')).toBe('/bob')
  })

  it('tanpa saran atau gagal memuat: kartu tidak dirender', async () => {
    api.suggestions.mockResolvedValueOnce({ items: [] })
    expect((await mountCard()).find('section').exists()).toBe(false)
    api.suggestions.mockRejectedValueOnce(new Error('x'))
    expect((await mountCard()).find('section').exists()).toBe(false)
  })

  it('Add Friend mengirim permintaan lalu menampilkan "Request Sent" (sekali saja)', async () => {
    const w = await mountCard()
    const add = w.findAll('li')[0]!.findAll('button')[0]!
    expect(add.text()).toBe('Add Friend')
    await add.trigger('click')
    await flushPromises()
    expect(api.send).toHaveBeenCalledWith('2')
    expect(w.findAll('li')[0]!.text()).toContain('Request Sent')
    expect(
      w
        .findAll('li')[0]!
        .findAll('button')
        .map((b) => b.text()),
    ).toEqual(['×'])
    expect(api.send).toHaveBeenCalledTimes(1)
  })

  it.each(['REQUEST_PENDING', 'ALREADY_FRIENDS'])(
    'galat %s dianggap sama dengan terkirim',
    async (code) => {
      api.send.mockRejectedValueOnce(new ApiRequestError(409, code, ['x']))
      const w = await mountCard()
      await w.findAll('li')[0]!.findAll('button')[0]!.trigger('click')
      await flushPromises()
      expect(w.findAll('li')[0]!.text()).toContain('Request Sent')
      expect(w.find('[role="alert"]').exists()).toBe(false)
    },
  )

  it('pengguna sudah hilang (404): barisnya dibuang; galat lain: pesan dan tombol tetap', async () => {
    api.send.mockRejectedValueOnce(new ApiRequestError(404, 'NOT_FOUND', ['x']))
    const w = await mountCard()
    await w.findAll('li')[0]!.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(w.findAll('li')).toHaveLength(1)

    api.send.mockRejectedValueOnce(new Error('jaringan'))
    await w.findAll('li')[0]!.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('That did not work. Please try again.')
    expect(w.findAll('li')[0]!.findAll('button')[0]!.text()).toBe('Add Friend')
  })

  it('tombol × menyembunyikan satu saran; menyingkirkan yang terakhir menghilangkan kartu', async () => {
    const w = await mountCard()
    const remove = (i: number) => w.findAll('li')[i]!.find('button[aria-label^="Remove"]')
    expect(remove(0).attributes('aria-label')).toBe('Remove: Bob')
    await remove(0).trigger('click')
    expect(w.findAll('li')).toHaveLength(1)
    await remove(0).trigger('click')
    expect(w.find('section').exists()).toBe(false)
  })
})

describe('BirthdaysCard', () => {
  const mountCard = async () => {
    const w = mount(BirthdaysCard, { global: { plugins: [router()] } })
    await flushPromises()
    return w
  }

  it('meminta tanggal lokal hari ini dan menampilkan nama sebagai tautan', async () => {
    const w = await mountCard()
    expect(api.birthdays).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(w.text()).toContain('Birthdays')
    expect(w.text()).toContain('Bob has a birthday today.')
    expect(w.find('a').attributes('href')).toBe('/bob')
  })

  it('tanpa ulang tahun atau gagal memuat: kartu tidak dirender', async () => {
    api.birthdays.mockResolvedValueOnce({ items: [] })
    expect((await mountCard()).find('section').exists()).toBe(false)
    api.birthdays.mockRejectedValueOnce(new Error('x'))
    expect((await mountCard()).find('section').exists()).toBe(false)
  })
})
