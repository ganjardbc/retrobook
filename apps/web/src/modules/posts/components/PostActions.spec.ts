import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PostActions from './PostActions.vue'

describe('PostActions Save (SAV-01)', () => {
  it('menampilkan Save lalu Unsave dan memancarkan toggle-save', async () => {
    const w = mount(PostActions, { props: { liked: false, saved: false } })
    const btn = w.findAll('button').find((b) => b.text() === 'Save')!
    await btn.trigger('click')
    expect(w.emitted('toggle-save')).toHaveLength(1)
    await w.setProps({ saved: true })
    expect(w.findAll('button').some((b) => b.text() === 'Unsave')).toBe(true)
  })
})
