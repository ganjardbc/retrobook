import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useMediaQuery } from '@/composables/mobile'

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>()
  const mq = {
    matches: initial,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', () => mq)
  return {
    listeners,
    set(next: boolean) {
      mq.matches = next
      listeners.forEach((fn) => fn())
    },
  }
}

const probe = (query: string) =>
  mount(
    defineComponent({
      setup() {
        const matches = useMediaQuery(query)
        return () => h('span', matches.value ? 'ya' : 'tidak')
      },
    }),
  )

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('memakai nilai awal, mengikuti perubahan, dan berhenti mendengarkan saat dilepas', async () => {
    const mq = stubMatchMedia(true)
    const w = probe('(max-width: 640px)')
    expect(w.text()).toBe('ya')
    expect(mq.listeners.size).toBe(1)

    mq.set(false)
    await w.vm.$nextTick()
    expect(w.text()).toBe('tidak')

    w.unmount()
    expect(mq.listeners.size).toBe(0)
  })

  it('tanpa matchMedia (mis. jsdom) bernilai false', () => {
    vi.stubGlobal('matchMedia', undefined)
    const w = probe('(max-width: 640px)')
    expect(w.text()).toBe('tidak')
    w.unmount()
  })
})
