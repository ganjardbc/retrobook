import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import Lightbox from '@/components/Lightbox.vue'

const photos = [
  { url: '/a.png', alt: 'a' },
  { url: '/b.png', alt: 'b' },
  { url: '/c.png', alt: 'c' },
]
const src = () => document.body.querySelector('[role="dialog"] img')?.getAttribute('src')
afterEach(() => (document.body.innerHTML = ''))

describe('Lightbox', () => {
  it('panah kiri/kanan berputar, Escape dan tombol Close mengirim close', async () => {
    const w = mount(Lightbox, { props: { photos, start: 0 }, attachTo: document.body })
    expect(src()).toBe('/a.png')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await w.vm.$nextTick()
    expect(src()).toBe('/c.png')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await w.vm.$nextTick()
    expect(src()).toBe('/a.png')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
    ;(document.body.querySelector('.lb__close') as HTMLElement).click()
    expect(w.emitted('close')).toHaveLength(2)
    w.unmount()
  })

  it('satu foto: tanpa panah dan penghitung', () => {
    const w = mount(Lightbox, {
      props: { photos: [photos[0]!], start: 0 },
      attachTo: document.body,
    })
    expect(document.body.querySelector('.lb__prev')).toBeNull()
    expect(document.body.querySelector('.lb__count')).toBeNull()
    w.unmount()
  })
})
