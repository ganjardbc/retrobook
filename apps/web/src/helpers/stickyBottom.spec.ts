import { afterEach, describe, expect, it, vi } from 'vitest'
import { stickyBottom } from '@/helpers/stickyBottom'

describe('stickyBottom', () => {
  afterEach(() => vi.unstubAllGlobals())

  function run(height: number, viewport: number) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('innerHeight', viewport)
    const el = document.createElement('div')
    Object.defineProperty(el, 'offsetHeight', { value: height })
    stickyBottom(el, () => 54)()
    return el.style.getPropertyValue('--sticky-top')
  }

  it('elemen pendek menempel di bawah navbar', () => expect(run(300, 800)).toBe('54px'))
  it('elemen lebih tinggi dari layar: top negatif sampai dasar terlihat', () =>
    expect(run(1000, 800)).toBe('-212px'))
})
