import type { FriendRequest, FriendsPage, UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { friendsApi } from '../api/friends'
import { useAuthStore } from '../stores/auth'
import FriendsView from './FriendsView.vue'

const u = (id: number, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const request = (id: number, name: string): FriendRequest => ({
  user: u(id, name),
  createdAt: '2026-11-24T00:00:00.000Z',
})
const page = (
  items: UserSummary[],
  nextCursor: number | null,
  total = items.length,
): FriendsPage => ({ items, nextCursor, total })

const mountView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })
  const w = mount(FriendsView, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('FriendsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.restoreAllMocks()
  })
  afterEach(() => vi.useRealTimers())

  it('menampilkan permintaan masuk dan daftar teman dengan jumlah', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({
      items: [request(7, 'Siti')],
      nextCursor: null,
    })
    vi.spyOn(friendsApi, 'list').mockResolvedValue(page([u(2, 'Budi'), u(3, 'Citra')], null))
    const w = await mountView()
    expect(w.text()).toContain('Friend Requests')
    expect(w.text()).toContain('Siti')
    expect(w.text()).toContain('2 friends')
    expect(w.findAll('.row').map((r) => r.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('Budi'), expect.stringContaining('Citra')]),
    )
  })

  it('tanpa permintaan masuk bagian permintaan tidak tampil; tanpa teman ada pesan kosong', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(friendsApi, 'list').mockResolvedValue(page([], null, 0))
    const w = await mountView()
    expect(w.text()).not.toContain('Friend Requests')
    expect(w.text()).toContain('No friends yet.')
  })

  it('Confirm: memanggil API, permintaan hilang dan teman baru muncul di daftar', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({
      items: [request(7, 'Siti')],
      nextCursor: null,
    })
    vi.spyOn(friendsApi, 'list').mockResolvedValue(page([u(2, 'Budi')], null))
    const accept = vi
      .spyOn(friendsApi, 'accept')
      .mockResolvedValue({ userId: 7, status: 'ACCEPTED' })
    const w = await mountView()
    const confirm = w.findAll('button').find((b) => b.text() === 'Confirm')!
    await confirm.trigger('click')
    await flushPromises()
    expect(accept).toHaveBeenCalledWith(7)
    expect(w.text()).not.toContain('Friend Requests')
    expect(w.text()).toContain('2 friends')
    expect(w.findAll('.row')[0]!.text()).toContain('Siti')
  })

  it('Delete Request memanggil API reject; galat menampilkan pesan dan permintaan tetap ada', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({
      items: [request(7, 'Siti')],
      nextCursor: null,
    })
    vi.spyOn(friendsApi, 'list').mockResolvedValue(page([], null, 0))
    vi.spyOn(friendsApi, 'reject').mockRejectedValue(new Error('x'))
    const w = await mountView()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Delete Request')!
      .trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('did not work')
    expect(w.text()).toContain('Siti')
  })

  it('Unfriend meminta konfirmasi dulu', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(friendsApi, 'list').mockResolvedValue(page([u(2, 'Budi')], null))
    const unfriend = vi.spyOn(friendsApi, 'unfriend').mockResolvedValue(undefined)
    const confirm = vi.spyOn(window, 'confirm')
    const w = await mountView()
    const btn = () => w.findAll('button').find((b) => b.text() === 'Unfriend')!
    confirm.mockReturnValueOnce(false)
    await btn().trigger('click')
    expect(unfriend).not.toHaveBeenCalled()
    confirm.mockReturnValueOnce(true)
    await btn().trigger('click')
    await flushPromises()
    expect(unfriend).toHaveBeenCalledWith(2)
    expect(w.text()).toContain('No friends yet.')
  })

  it('Load more: memuat halaman berikutnya; tombol hilang setelah habis', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    const list = vi
      .spyOn(friendsApi, 'list')
      .mockResolvedValueOnce(page([u(2, 'Budi')], 2, 2))
      .mockResolvedValueOnce(page([u(3, 'Citra')], null, 2))
    const w = await mountView()
    const more = () => w.findAll('button').find((b) => b.text() === 'Load more')
    expect(more()).toBeTruthy()
    await more()!.trigger('click')
    await flushPromises()
    expect(list.mock.calls[1]![0]).toBe(2)
    expect(w.findAll('.row')).toHaveLength(2)
    expect(more()).toBeUndefined()
  })

  it('pencarian memakai debounce dan hanya satu panggilan untuk beberapa ketikan', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    const list = vi.spyOn(friendsApi, 'list').mockResolvedValue(page([u(2, 'Budi')], null))
    const w = await mountView()
    list.mockClear()
    vi.useFakeTimers()
    const input = w.find('input[type="search"]')
    await input.setValue('b')
    await input.setValue('bu')
    await input.setValue('bud')
    vi.advanceTimersByTime(299)
    expect(list).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2)
    await flushPromises()
    expect(list).toHaveBeenCalledTimes(1)
    expect(list.mock.calls[0]).toEqual([null, 'bud'])
  })

  it('hasil pencarian kosong menampilkan pesan khusus', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(friendsApi, 'list')
      .mockResolvedValueOnce(page([u(2, 'Budi')], null))
      .mockResolvedValueOnce(page([], null, 0))
    const w = await mountView()
    vi.useFakeTimers()
    await w.find('input[type="search"]').setValue('zzz')
    vi.advanceTimersByTime(400)
    vi.useRealTimers()
    await flushPromises()
    expect(w.text()).toContain('No friends match your search.')
  })

  it('gagal memuat: pesan dan tombol coba lagi', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(friendsApi, 'list')
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(page([u(2, 'Budi')], null))
    const w = await mountView()
    expect(w.text()).toContain('Could not load friends.')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Budi')
  })
})
