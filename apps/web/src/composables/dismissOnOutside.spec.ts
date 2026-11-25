import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useDismissOnOutside } from './dismissOnOutside'

describe('useDismissOnOutside', () => {
  it('menutup saat klik di luar, tidak saat klik di dalam', async () => {
    const open = ref(true)
    const Cmp = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null)
        useDismissOnOutside(root, open)
        return () => h('div', { ref: root }, [h('button', { id: 'in' })])
      },
    })
    const w = mount(Cmp, { attachTo: document.body })
    w.get('#in').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(open.value).toBe(true)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(open.value).toBe(false)
    w.unmount()
  })
})
