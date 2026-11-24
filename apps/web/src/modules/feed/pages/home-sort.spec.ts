import type { Post } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/modules/feed/pages/HomeView.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { postsApi } from '@/modules/posts/services/api'

const post = (id: number): Post =>
  ({
    id,
    author: { id: 1, username: 'a', displayName: 'A', avatarUrl: null, isBot: false },
    wallOwner: null,
    sharedFrom: null,
    content: `p${id}`,
    imageUrl: null,
    feeling: null,
    privacy: 'FRIENDS',
    tags: [],
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    likedPreview: [],
    editedAt: null,
    createdAt: '2026-11-24T00:00:00.000Z',
  }) as Post

describe('HomeView: sort feed (POST-09)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('dropdown Most Recent / Top Stories; memilih Top Stories memuat ulang dengan sort=top', async () => {
    const spy = vi
      .spyOn(postsApi, 'feed')
      .mockResolvedValueOnce({ items: [post(2), post(1)], nextCursor: null })
      .mockResolvedValueOnce({ items: [post(1), post(2)], nextCursor: null })
    useAuthStore().user = { id: 1, username: 'a', displayName: 'A' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })
    const w = mount(HomeView, { global: { plugins: [router] } })
    await flushPromises()
    const select = w.find('select.home__sort-select')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['Most Recent', 'Top Stories'])
    expect((select.element as HTMLSelectElement).value).toBe('recent')
    expect(w.findAll('.post__text').map((p) => p.text())).toEqual(['p2', 'p1'])

    await select.setValue('top')
    await flushPromises()
    expect(spy.mock.calls[1]).toEqual([null, undefined, 'top'])
    expect(w.findAll('.post__text').map((p) => p.text())).toEqual(['p1', 'p2'])
  })
})
