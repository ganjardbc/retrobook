import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppLayout from './AppLayout.vue'

describe('AppLayout aksesibilitas', () => {
  it('punya tautan lompat ke <main id=main-content>', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<p>x</p>' } }],
    })
    await router.push('/')
    const w = mount(AppLayout, {
      global: {
        plugins: [createPinia(), router],
        stubs: { NavBar: true, LeftMenu: true, TrendingCard: true, SponsoredCard: true },
      },
    })
    expect(w.get('a.skip-link').attributes('href')).toBe('#main-content')
    expect(w.get('main').attributes('id')).toBe('main-content')
  })
})
