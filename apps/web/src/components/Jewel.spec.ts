import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routerKey } from 'vue-router'
import Jewel from '@/components/Jewel.vue'

const mk = (props: Record<string, unknown> = {}) =>
  mount(Jewel, {
    props: { icon: 'mdi:earth', label: 'Notifications', ...props },
    slots: { default: '<p class="body">isi</p>' },
    attachTo: document.body,
  })

describe('Jewel', () => {
  it('tanpa hitungan: tanpa badge; label aksesibel apa adanya', () => {
    const w = mk({ count: 0 })
    expect(w.find('.jewel__badge').exists()).toBe(false)
    expect(w.find('button').attributes('aria-label')).toBe('Notifications')
    w.unmount()
  })

  it.each([
    [3, undefined, '3'],
    [100, undefined, '99+'],
    [10, true, '10+'],
  ])('hitungan %s (more=%s) tampil "%s" dan masuk label', (count, more, text) => {
    const w = mk({ count, more })
    expect(w.find('.jewel__badge').text()).toBe(text)
    expect(w.find('button').attributes('aria-label')).toBe(`Notifications (${text})`)
    w.unmount()
  })

  it('klik membuka dan menutup panel; aria-expanded mengikuti', async () => {
    const w = mk()
    const btn = w.find('button')
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(w.find('.body').exists()).toBe(false)
    await btn.trigger('click')
    expect(btn.attributes('aria-expanded')).toBe('true')
    expect(w.find('.body').exists()).toBe(true)
    await btn.trigger('click')
    expect(w.find('.body').exists()).toBe(false)
    w.unmount()
  })

  it('klik di luar dan Escape menutup panel', async () => {
    const w = mk()
    await w.find('button').trigger('click')
    document.body.click()
    await w.vm.$nextTick()
    expect(w.find('.body').exists()).toBe(false)

    await w.find('button').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('.body').exists()).toBe(false)
    w.unmount()
  })

  describe('di ponsel (≤640 px)', () => {
    const asMobile = (matches: boolean) =>
      vi.stubGlobal('matchMedia', () => ({
        matches,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
    const mkWithRouter = (push: () => void, props: Record<string, unknown> = {}) =>
      mount(Jewel, {
        props: { icon: 'mdi:earth', label: 'Notifications', allTo: '/notifications', ...props },
        slots: { default: '<p class="body">isi</p>' },
        global: { provide: { [routerKey as symbol]: { push } }, stubs: { RouterLink: true } },
        attachTo: document.body,
      })
    afterEach(() => vi.unstubAllGlobals())

    it('klik langsung membuka halaman lengkap tanpa popup dan tanpa aria popup', async () => {
      asMobile(true)
      const push = vi.fn()
      const w = mkWithRouter(push)
      const btn = w.find('button')
      expect(btn.attributes('aria-haspopup')).toBeUndefined()
      await btn.trigger('click')
      expect(push).toHaveBeenCalledWith('/notifications')
      expect(w.find('.body').exists()).toBe(false)
      w.unmount()
    })

    it('tanpa allTo tetap popup; di desktop tetap popup', async () => {
      asMobile(true)
      const push = vi.fn()
      const noLink = mkWithRouter(push, { allTo: undefined })
      await noLink.find('button').trigger('click')
      expect(noLink.find('.body').exists()).toBe(true)
      noLink.unmount()

      asMobile(false)
      const desktop = mkWithRouter(push)
      await desktop.find('button').trigger('click')
      expect(push).not.toHaveBeenCalled()
      expect(desktop.find('.body').exists()).toBe(true)
      desktop.unmount()
    })
  })
})
