import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { session } from '@/helpers/session'
import { useAuthStore } from '@/modules/auth/stores'
import AppLayout from '@/layouts/AppLayout.vue'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'

vi.mock('@/plugins/realtime', () => ({
  getSocket: () => ({ on() {}, off() {}, io: { on() {}, off() {} } }),
  disconnectRealtime() {},
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [{ path: '', name: 'home', component: { template: '<p>feed</p>' } }],
      },
      { path: '/login', name: 'login', component: { template: '<p>login</p>' } },
      { path: '/:username', component: { template: '<p>profile</p>' } },
    ],
  })

describe('Avatar', () => {
  it('tanpa foto: inisial dan label aksesibel', () => {
    const w = mount(Avatar, { props: { name: 'budi santoso', size: 'm' } })
    expect(w.text()).toBe('B')
    expect(w.attributes('aria-label')).toBe("budi santoso's photo")
    expect(w.classes()).toContain('avatar--m')
  })
  it('dengan foto: img beralt teks', () => {
    const w = mount(Avatar, { props: { name: 'Sari', src: '/u/1.jpg' } })
    expect(w.find('img').attributes('alt')).toBe("Sari's photo")
  })
})

describe('Button', () => {
  it('default: tombol type=button, varian primary', () => {
    const w = mount(Button, { slots: { default: 'Post' } })
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.attributes('type')).toBe('button')
    expect(w.classes()).toContain('btn--primary')
  })
  it('disabled tidak memicu klik', async () => {
    const w = mount(Button, { props: { disabled: true } })
    expect(w.attributes('disabled')).toBeDefined()
  })
  it('dengan `to` jadi tautan', async () => {
    const router = makeRouter()
    const w = mount(Button, {
      props: { to: '/login', variant: 'success' },
      global: { plugins: [router] },
    })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('/login')
  })
})

describe('AppLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    session.clear()
    setActivePinia(createPinia())
    useAuthStore().user = { id: '1', username: 'budi', displayName: 'Budi' }
  })

  it('menampilkan navbar, menu kiri, konten halaman, dan label parodi', async () => {
    const router = makeRouter()
    await router.push('/')
    const w = mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.find('header.navbar').exists()).toBe(true)
    expect(w.findAll('a').some((a) => a.attributes('href') === '/budi')).toBe(true)
    expect(w.text()).toContain('News Feed')
    expect(w.text()).toContain('feed') // konten RouterView
    expect(w.text()).toContain('Fun project / parody')
  })

  const asPhone = (matches: boolean) =>
    vi.stubGlobal('matchMedia', () => ({
      matches,
      addEventListener() {},
      removeEventListener() {},
    }))

  it('ponsel: tombol menu di bar tab membuka laci, berubah jadi tutup, dan menutupnya lagi', async () => {
    asPhone(true)
    const router = makeRouter()
    await router.push('/')
    const w = mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    const toggle = () => w.find('button[aria-controls="left-menu"]')
    expect(w.find('.layout__left--open').exists()).toBe(false)
    expect(toggle().attributes('aria-expanded')).toBe('false')

    await toggle().trigger('click')
    expect(w.find('.layout__left--open').exists()).toBe(true)
    expect(toggle().attributes('aria-expanded')).toBe('true')

    await toggle().trigger('click')
    expect(w.find('.layout__left--open').exists()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('desktop: tanpa hamburger di halaman biasa dan satu daftar chat per layout', async () => {
    asPhone(false)
    const router = makeRouter()
    await router.push('/')
    const w = mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.find('button[aria-controls="left-menu"]').exists()).toBe(false)
    // Rute uji memakai AppLayout sebagai komponen, jadi layout ter-render bersarang: hitung per layout.
    expect(w.findAll('section.chat')).toHaveLength(w.findAll('.layout').length)
    expect(w.find('.chat--inline').exists()).toBe(false)
    vi.unstubAllGlobals()
  })
})
