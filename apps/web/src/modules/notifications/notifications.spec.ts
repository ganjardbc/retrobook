import type { AppNotification } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import NotificationsJewel from '@/modules/notifications/components/NotificationsJewel.vue'
import { notificationsApi } from '@/modules/notifications/services/api'
import { useNotificationsStore } from '@/modules/notifications/stores'

type Handler = (...a: unknown[]) => void
const handlers = new Map<string, Handler[]>()
const managerHandlers = new Map<string, Handler[]>()
const add = (m: Map<string, Handler[]>) => (e: string, h: Handler) =>
  m.set(e, [...(m.get(e) ?? []), h])
const remove = (m: Map<string, Handler[]>) => (e: string, h: Handler) =>
  m.set(
    e,
    (m.get(e) ?? []).filter((x) => x !== h),
  )
const fake = {
  on: add(handlers),
  off: remove(handlers),
  io: { on: add(managerHandlers), off: remove(managerHandlers) },
}
vi.mock('@/plugins/realtime', () => ({ getSocket: () => fake, disconnectRealtime: vi.fn() }))
vi.mock('@/modules/notifications/services/api', () => ({
  notificationsApi: { list: vi.fn(), unreadCount: vi.fn(), markRead: vi.fn() },
}))
const api = vi.mocked(notificationsApi)
const push = (n: AppNotification) => handlers.get('notification:new')?.forEach((h) => h(n))

const mkN = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'LIKE',
  actor: { id: '9', username: 'sari', displayName: 'Sari', avatarUrl: null, isBot: false },
  postId: '1',
  commentId: null,
  text: 'Sari likes your post',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  handlers.clear()
  managerHandlers.clear()
  vi.resetAllMocks()
  api.unreadCount.mockResolvedValue({ count: 2 })
  api.list.mockResolvedValue({ items: [mkN('2'), mkN('1', { readAt: 'x' })], nextCursor: null })
  api.markRead.mockResolvedValue({ count: 0 })
})

describe('notifications store', () => {
  it('start: ambil hitungan awal dan dengarkan event; stop membersihkan', async () => {
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    expect(s.unread).toBe(2)
    expect(handlers.get('notification:new')).toHaveLength(1)
    s.stop()
    expect(handlers.get('notification:new')).toHaveLength(0)
    expect(s.unread).toBe(0)
  })

  it('start dua kali tidak menggandakan listener', () => {
    const s = useNotificationsStore()
    s.start()
    s.start()
    expect(handlers.get('notification:new')).toHaveLength(1)
  })

  it('event baru saat dropdown tertutup: badge naik dan masuk paling atas', async () => {
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    push(mkN('5'))
    expect(s.unread).toBe(3)
    expect(s.items[0]!.id).toBe('5')
    expect(s.lastReceived?.id).toBe('5')
  })

  it('event ganda dengan id sama diabaikan', async () => {
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    push(mkN('5'))
    push(mkN('5'))
    expect(s.items).toHaveLength(1)
    expect(s.unread).toBe(3)
  })

  it('event saat dropdown terbuka: tidak menaikkan badge, langsung ditandai terbaca', async () => {
    const s = useNotificationsStore()
    s.start(() => true)
    await flushPromises()
    push(mkN('5'))
    expect(s.unread).toBe(2)
    expect(api.markRead).toHaveBeenCalledWith(['5'])
    expect(s.fresh.has('5')).toBe(true)
  })

  it('open: memuat daftar, menyorot yang belum dibaca, menandai semua terbaca', async () => {
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    await s.open()
    expect(s.items.map((n) => n.id)).toEqual(['2', '1'])
    expect([...s.fresh]).toEqual(['2'])
    expect(api.markRead).toHaveBeenCalledWith()
    expect(s.unread).toBe(0)
  })

  it('open tanpa yang belum dibaca tidak memanggil markRead', async () => {
    api.unreadCount.mockResolvedValue({ count: 0 })
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    await s.open()
    expect(api.markRead).not.toHaveBeenCalled()
  })

  it('open gagal: failed true, badge tidak dihapus', async () => {
    api.list.mockRejectedValue(new Error('x'))
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    await s.open()
    expect(s.failed).toBe(true)
    expect(s.unread).toBe(2)
  })

  it('reconnect: hitungan diambil ulang', async () => {
    const s = useNotificationsStore()
    s.start()
    await flushPromises()
    api.unreadCount.mockResolvedValue({ count: 7 })
    managerHandlers.get('reconnect')?.forEach((h) => h())
    await flushPromises()
    expect(s.unread).toBe(7)
  })
})

describe('NotificationsJewel', () => {
  const mount_ = () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: { template: '<p />' } }],
    })
    return mount(NotificationsJewel, { global: { plugins: [router] }, attachTo: document.body })
  }

  it('badge dari hitungan; membuka dropdown memuat daftar dan mengosongkan badge', async () => {
    const w = mount_()
    await flushPromises()
    expect(w.find('.jewel__badge').text()).toBe('2')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.findAll('li.is-new')).toHaveLength(1)
    expect(w.find('.jewel__badge').exists()).toBe(false)
    w.unmount()
  })

  it('daftar kosong dan gagal punya pesan sendiri', async () => {
    api.list.mockResolvedValueOnce({ items: [], nextCursor: null })
    const w = mount_()
    await flushPromises()
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('No notifications yet.')
    await w.find('button').trigger('click')

    api.list.mockRejectedValueOnce(new Error('x'))
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    w.unmount()
  })

  it('event realtime menaikkan badge tanpa membuka dropdown', async () => {
    const w = mount_()
    await flushPromises()
    push(mkN('9'))
    await flushPromises()
    expect(w.find('.jewel__badge').text()).toBe('3')
    w.unmount()
  })
})
