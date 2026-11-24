import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
})
