import type { AppNotification, FriendRequest } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import FriendRequestsJewel from '@/modules/friends/components/FriendRequestsJewel.vue'
import { friendsApi } from '@/modules/friends/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import { useNotificationsStore } from '@/modules/notifications/stores'

vi.mock('@/plugins/realtime', () => ({ getSocket: vi.fn(), disconnectRealtime: vi.fn() }))
vi.mock('@/modules/friends/services/api', () => ({
  friendsApi: { requests: vi.fn(), accept: vi.fn(), reject: vi.fn() },
}))
const api = vi.mocked(friendsApi)

const req = (id: string): FriendRequest => ({
  user: { id, username: `u${id}`, displayName: `User ${id}`, avatarUrl: null, isBot: false },
  createdAt: new Date().toISOString(),
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  useAuthStore().user = { id: '1', username: 'me', displayName: 'Me' }
  api.requests.mockResolvedValue({ items: [req('2'), req('3')], nextCursor: null })
  api.accept.mockResolvedValue({ userId: '2', status: 'ACCEPTED' })
  api.reject.mockResolvedValue(undefined)
})

const mount_ = () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p />' } }],
  })
  return mount(FriendRequestsJewel, { global: { plugins: [router] }, attachTo: document.body })
}

describe('FriendRequestsJewel', () => {
  it('badge = jumlah permintaan masuk; daftar menampilkan Confirm dan Delete Request', async () => {
    const w = mount_()
    await flushPromises()
    expect(w.find('.jewel__badge').text()).toBe('2')
    await w.find('button').trigger('click')
    expect(w.text()).toContain('User 2')
    expect(w.text()).toContain('Confirm')
    expect(w.text()).toContain('Delete Request')
    expect(w.find('a[href="/friends"]').text()).toBe('See All')
    w.unmount()
  })

  it('halaman pertama penuh (ada cursor): badge bertanda "+"', async () => {
    api.requests.mockResolvedValue({ items: [req('2'), req('3')], nextCursor: '3' })
    const w = mount_()
    await flushPromises()
    expect(w.find('.jewel__badge').text()).toBe('2+')
    w.unmount()
  })

  it('Confirm menerima dan menurunkan badge', async () => {
    const w = mount_()
    await flushPromises()
    await w.find('button').trigger('click')
    await w.findAll('.item button')[0]!.trigger('click')
    await flushPromises()
    expect(api.accept).toHaveBeenCalledWith('2')
    expect(w.find('.jewel__badge').text()).toBe('1')
    w.unmount()
  })

  it('kosong: pesan kosong dan tanpa badge', async () => {
    api.requests.mockResolvedValue({ items: [], nextCursor: null })
    const w = mount_()
    await flushPromises()
    await w.find('button').trigger('click')
    expect(w.text()).toContain('No new requests.')
    expect(w.find('.jewel__badge').exists()).toBe(false)
    w.unmount()
  })

  it('notifikasi realtime FRIEND_REQUEST memuat ulang permintaan; tipe lain tidak', async () => {
    const w = mount_()
    await flushPromises()
    api.requests.mockClear()
    api.requests.mockResolvedValue({ items: [req('2'), req('3'), req('4')], nextCursor: null })
    const n = (type: AppNotification['type']) =>
      ({
        id: '1',
        type,
        actor: null,
        postId: null,
        commentId: null,
        text: '',
        readAt: null,
        createdAt: '',
      }) as AppNotification

    useNotificationsStore().lastReceived = n('LIKE')
    await flushPromises()
    expect(api.requests).not.toHaveBeenCalled()

    useNotificationsStore().lastReceived = n('FRIEND_REQUEST')
    await flushPromises()
    expect(api.requests).toHaveBeenCalledTimes(1)
    expect(w.find('.jewel__badge').text()).toBe('3')
    w.unmount()
  })
})
