import type { UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import SearchView from '@/modules/search/pages/SearchView.vue'
import SearchBox from '@/modules/search/components/SearchBox.vue'
import { searchApi } from '@/modules/search/services/api'

vi.mock('@/modules/search/services/api', async (orig) => ({
  ...(await orig<typeof import('@/modules/search/services/api')>()),
  searchApi: { people: vi.fn(), posts: vi.fn() },
}))
const api = vi.mocked(searchApi)

const user = (id: string, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/search', name: 'search', component: SearchView },
      { path: '/:username', name: 'profile', component: { template: '<p>profil</p>' } },
      { path: '/', name: 'home', component: { template: '<p>home</p>' } },
    ],
  })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  api.people.mockResolvedValue({ items: [user('1', 'Budi'), user('2', 'Sari')], nextCursor: null })
})

describe('SearchBox', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const mountBox = async () => {
    const router = makeRouter()
    await router.push('/')
    const w = mount(SearchBox, { global: { plugins: [router] }, attachTo: document.body })
    return { w, router }
  }
  const type = async (w: Awaited<ReturnType<typeof mountBox>>['w'], text: string) => {
    await w.find('input').setValue(text)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
  }

  it('di bawah 2 karakter: tidak mencari dan tidak membuka dropdown', async () => {
    const { w } = await mountBox()
    await type(w, 'b')
    await type(w, '  b ')
    expect(api.people).not.toHaveBeenCalled()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    w.unmount()
  })

  it('mencari setelah jeda, memangkas spasi, dan menampilkan hasil serta baris "See all"', async () => {
    const { w } = await mountBox()
    await type(w, '  bu ')
    expect(api.people).toHaveBeenCalledTimes(1)
    expect(api.people).toHaveBeenCalledWith('bu')
    const opts = w.findAll('[role="option"]')
    expect(
      opts.map((o) =>
        o.find('.search__name').exists() ? o.find('.search__name').text() : o.text(),
      ),
    ).toEqual(['Budi', 'Sari', 'See all results for "bu"'])
    w.unmount()
  })

  it('mengetik cepat hanya memicu satu permintaan (debounce); respons lama dibuang', async () => {
    const { w } = await mountBox()
    let resolveFirst!: (v: unknown) => void
    api.people.mockReturnValueOnce(new Promise((r) => (resolveFirst = r)) as never)
    await w.find('input').setValue('bu')
    await vi.advanceTimersByTimeAsync(300) // permintaan pertama terkirim, belum selesai
    api.people.mockResolvedValueOnce({ items: [user('9', 'Bunga')], nextCursor: null })
    await type(w, 'bun')
    expect(w.findAll('.search__name')[0]!.text()).toBe('Bunga')
    resolveFirst({ items: [user('1', 'Budi')], nextCursor: null }) // datang terlambat
    await flushPromises()
    expect(w.findAll('.search__name')[0]!.text()).toBe('Bunga')
    w.unmount()
  })

  it('panah dan Enter membuka profil yang dipilih dan mengosongkan kotak', async () => {
    const { w, router } = await mountBox()
    await type(w, 'bu')
    const input = w.find('input')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(w.findAll('[role="option"]')[1]!.attributes('aria-selected')).toBe('true')
    expect(input.attributes('aria-activedescendant')).toBe(
      w.findAll('[role="option"]')[1]!.attributes('id'),
    )
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/sari')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    w.unmount()
  })

  it('panah atas dari awal menuju "See all"; Enter tanpa pilihan membuka halaman hasil', async () => {
    const { w, router } = await mountBox()
    await type(w, 'bu')
    const input = w.find('input')
    await input.trigger('keydown', { key: 'ArrowUp' })
    const opts = w.findAll('[role="option"]')
    expect(opts.at(-1)!.attributes('aria-selected')).toBe('true')
    await input.trigger('keydown', { key: 'ArrowDown' }) // lingkar kembali ke yang pertama
    expect(w.findAll('[role="option"]')[0]!.attributes('aria-selected')).toBe('true')

    await w.find('input').setValue('bu') // reset pilihan
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('search')
    expect(router.currentRoute.value.query.q).toBe('bu')
    w.unmount()
  })

  it('Escape dan klik di luar menutup dropdown; klik hasil membuka profil', async () => {
    const { w, router } = await mountBox()
    await type(w, 'bu')
    await w.find('input').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    await w.find('input').trigger('focus')
    expect(w.find('[role="listbox"]').exists()).toBe(true)
    document.body.click()
    await flushPromises()
    expect(w.find('[role="listbox"]').exists()).toBe(false)

    await w.find('input').trigger('focus')
    await w.findAll('[role="option"]')[0]!.trigger('mousedown')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/budi')
    w.unmount()
  })

  it('galat jaringan: dropdown hanya berisi "See all", tanpa pesan galat', async () => {
    api.people.mockRejectedValue(new Error('x'))
    const { w } = await mountBox()
    await type(w, 'bu')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['See all results for "bu"'])
    w.unmount()
  })

  it('isi kotak mengikuti ?q= di halaman hasil', async () => {
    const router = makeRouter()
    await router.push('/search?q=sari')
    const w = mount(SearchBox, { global: { plugins: [router] } })
    expect((w.find('input').element as HTMLInputElement).value).toBe('sari')
    await router.push('/search?q=budi')
    await flushPromises()
    expect((w.find('input').element as HTMLInputElement).value).toBe('budi')
  })
})

describe('SearchView', () => {
  const mountAt = async (path: string) => {
    const router = makeRouter()
    await router.push(path)
    const w = mount(SearchView, { global: { plugins: [router] } })
    await flushPromises()
    return { w, router }
  }

  it('menampilkan hasil dengan tautan ke profil', async () => {
    const { w } = await mountAt('/search?q=bu')
    expect(api.people).toHaveBeenCalledWith('bu', null, 10)
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.find('a[href="/budi"]').text()).toBe('Budi')
  })

  it('tab Posts memanggil pencarian isi post (SRC-05) dan menampilkan keadaan kosong', async () => {
    api.posts.mockResolvedValue({ items: [], nextCursor: null })
    const { w } = await mountAt('/search?q=kopi&type=posts')
    expect(api.posts).toHaveBeenCalledWith('kopi', null)
    expect(api.people).not.toHaveBeenCalled()
    expect(w.text()).toContain('No results for "kopi"')
  })

  it.each(['/search', '/search?q=', '/search?q=%20b%20'])(
    '%s: pesan terlalu pendek, tanpa memanggil API',
    async (path) => {
      const { w } = await mountAt(path)
      expect(w.text()).toContain('Type at least 2 characters to search.')
      expect(api.people).not.toHaveBeenCalled()
    },
  )

  it('tanpa hasil: "No results for ..."; gagal: pesan dan Try again', async () => {
    api.people.mockResolvedValueOnce({ items: [], nextCursor: null })
    const empty = await mountAt('/search?q=zzz')
    expect(empty.w.text()).toContain('No results for "zzz".')

    api.people.mockRejectedValueOnce(new Error('x'))
    const failed = await mountAt('/search?q=zzz')
    expect(failed.w.find('[role="alert"]').exists()).toBe(true)
    await failed.w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(failed.w.findAll('li')).toHaveLength(2)
  })

  it('Load more memakai cursor; berhenti bila habis', async () => {
    api.people
      .mockResolvedValueOnce({ items: [user('1', 'Budi')], nextCursor: '1' })
      .mockResolvedValueOnce({ items: [user('2', 'Sari')], nextCursor: null })
    const { w } = await mountAt('/search?q=bu')
    await w.find('.card__more button').trigger('click')
    await flushPromises()
    expect(api.people).toHaveBeenLastCalledWith('bu', '1', 10)
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.find('.card__more').exists()).toBe(false)
  })

  it('kata kunci berganti: daftar dimuat ulang dari awal', async () => {
    const { w, router } = await mountAt('/search?q=bu')
    api.people.mockResolvedValueOnce({ items: [user('3', 'Andi')], nextCursor: null })
    await router.push('/search?q=andi')
    await flushPromises()
    expect(api.people).toHaveBeenLastCalledWith('andi', null, 10)
    expect(w.findAll('.row__name').map((l) => l.text())).toEqual(['Andi'])
  })
})
