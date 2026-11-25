import type { PokeItem, Profile } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores'
import { useNotificationsStore } from '@/modules/notifications/stores'
import PokesView from '@/modules/pokes/pages/PokesView.vue'
import { pokesApi } from '@/modules/pokes/services/api'
import { usePokesStore } from '@/modules/pokes/stores'
import ProfileHeader from '@/modules/profile/components/ProfileHeader.vue'

vi.mock('@/plugins/realtime', () => ({ getSocket: vi.fn(), disconnectRealtime: vi.fn() }))
vi.mock('@/modules/pokes/services/api', () => ({
  pokesApi: { list: vi.fn(), poke: vi.fn(), dismiss: vi.fn() },
}))
const api = vi.mocked(pokesApi)

const item = (id: string): PokeItem => ({
  user: { id, username: `u${id}`, displayName: `User ${id}`, avatarUrl: null, isBot: false },
  createdAt: new Date().toISOString(),
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  useAuthStore().user = { id: '1', username: 'me', displayName: 'Me' }
  api.list.mockResolvedValue({ items: [item('2'), item('3')], nextCursor: null })
  api.poke.mockResolvedValue({ userId: '2', createdAt: '' })
  api.dismiss.mockResolvedValue(undefined)
})

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p />' } }],
  })

describe('pokes store', () => {
  it('load: mengisi daftar, tanpa duplikat, menandai selesai', async () => {
    const s = usePokesStore()
    await s.load()
    expect(s.items.map((p) => p.user.id)).toEqual(['2', '3'])
    expect(s.done).toBe(true)
  })

  it('load gagal: failed true; percobaan ulang berhasil', async () => {
    api.list.mockRejectedValueOnce(new Error('x'))
    const s = usePokesStore()
    await s.load()
    expect(s.failed).toBe(true)
    await s.load()
    expect(s.failed).toBe(false)
    expect(s.items).toHaveLength(2)
  })

  it('pokeBack dan remove mengeluarkan item; gagal tidak mengubah daftar', async () => {
    const s = usePokesStore()
    await s.load()
    expect(await s.pokeBack('2')).toBe(true)
    expect(api.poke).toHaveBeenCalledWith('2')
    expect(s.items.map((p) => p.user.id)).toEqual(['3'])

    api.dismiss.mockRejectedValueOnce(new Error('x'))
    expect(await s.remove('3')).toBe(false)
    expect(s.items).toHaveLength(1)
    expect(await s.remove('3')).toBe(true)
    expect(s.items).toHaveLength(0)
  })

  it('refresh membuang hasil lama dan memuat dari awal', async () => {
    const s = usePokesStore()
    await s.load()
    api.list.mockResolvedValue({ items: [item('9')], nextCursor: null })
    await s.refresh()
    expect(s.items.map((p) => p.user.id)).toEqual(['9'])
  })
})

describe('PokesView', () => {
  const mountView = () =>
    mount(PokesView, { global: { plugins: [router()] }, attachTo: document.body })

  it('menampilkan PokeCard dengan Poke Back dan Remove', async () => {
    const w = mountView()
    await flushPromises()
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.text()).toContain('User 2')
    expect(w.text()).toContain('poked you.')
    expect(w.text()).toContain('Poke Back')
    expect(w.text()).toContain('Remove')
    w.unmount()
  })

  it('Poke Back memanggil API dan menghapus kartunya', async () => {
    const w = mountView()
    await flushPromises()
    await w.findAll('.poke__link')[0]!.trigger('click')
    await flushPromises()
    expect(api.poke).toHaveBeenCalledWith('2')
    expect(w.findAll('li')).toHaveLength(1)
    w.unmount()
  })

  it('aksi gagal menampilkan pesan error dan kartu tetap ada', async () => {
    api.dismiss.mockRejectedValue(new Error('x'))
    const w = mountView()
    await flushPromises()
    await w.findAll('.poke__link')[1]!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    expect(w.findAll('li')).toHaveLength(2)
    w.unmount()
  })

  it('kosong: pesan kosong', async () => {
    api.list.mockResolvedValue({ items: [], nextCursor: null })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('No pokes waiting.')
    w.unmount()
  })

  it('notifikasi POKE realtime memuat ulang; tipe lain tidak', async () => {
    const w = mountView()
    await flushPromises()
    api.list.mockClear()
    const n = (type: 'POKE' | 'LIKE') =>
      ({
        id: '1',
        type,
        actor: null,
        postId: null,
        commentId: null,
        text: '',
        readAt: null,
        createdAt: '',
      }) as never
    useNotificationsStore().lastReceived = n('LIKE')
    await flushPromises()
    expect(api.list).not.toHaveBeenCalled()
    useNotificationsStore().lastReceived = n('POKE')
    await flushPromises()
    expect(api.list).toHaveBeenCalledTimes(1)
    w.unmount()
  })
})

describe('ProfileHeader: tombol Poke', () => {
  const profile = (relationship: Profile['relationship']): Profile =>
    ({
      id: '7',
      username: 'siti',
      displayName: 'Siti',
      avatarUrl: null,
      isBot: false,
      coverUrl: null,
      friendCount: 1,
      relationship,
    }) as Profile
  const mountHeader = (rel: Profile['relationship']) =>
    mount(ProfileHeader, { props: { profile: profile(rel) }, global: { plugins: [router()] } })
  const pokeBtn = (w: ReturnType<typeof mountHeader>) =>
    w.findAll('button').find((b) => /^(Poke|Poked)$/.test(b.text()))

  it.each(['NONE', 'REQUEST_SENT', 'REQUEST_RECEIVED', 'SELF'] as const)(
    '%s: tidak ada tombol Poke',
    (rel) => {
      expect(pokeBtn(mountHeader(rel))).toBeUndefined()
    },
  )

  it('teman: Poke memanggil API lalu berubah menjadi Poked', async () => {
    const w = mountHeader('FRIENDS')
    await pokeBtn(w)!.trigger('click')
    await flushPromises()
    expect(api.poke).toHaveBeenCalledWith('7')
    expect(pokeBtn(w)!.text()).toBe('Poked')
  })

  it('gagal: pesan error, tombol tetap Poke', async () => {
    api.poke.mockRejectedValue(new Error('x'))
    const w = mountHeader('FRIENDS')
    await pokeBtn(w)!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    expect(pokeBtn(w)!.text()).toBe('Poke')
  })
})
