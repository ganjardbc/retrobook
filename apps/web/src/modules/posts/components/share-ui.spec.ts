import type { Post } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import PostCard from '@/modules/posts/components/PostCard.vue'
import SharePanel from '@/modules/posts/components/SharePanel.vue'
import SharedPostCard from '@/modules/posts/components/SharedPostCard.vue'

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })

const author = { id: 2, username: 'siti', displayName: 'Siti', avatarUrl: null, isBot: false }
const mkPost = (over: Partial<Post> = {}): Post => ({
  id: 1,
  author: { id: 1, username: 'budi', displayName: 'Budi', avatarUrl: null, isBot: false },
  wallOwner: null,
  sharedFrom: null,
  content: 'halo',
  imageUrl: null,
  feeling: null,
  privacy: 'FRIENDS',
  tags: [],
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  savedByMe: false,
  likedPreview: [],
  editedAt: null,
  createdAt: new Date().toISOString(),
  ...over,
})

describe('SharePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('kirim: memanggil API dengan teks dan privasi terpilih lalu memancarkan post baru', async () => {
    const created = mkPost({ id: 9 })
    const spy = vi.spyOn(postsApi, 'share').mockResolvedValue(created)
    const w = mount(SharePanel, { props: { postId: 5 } })
    expect((w.find('select').element as HTMLSelectElement).value).toBe('FRIENDS') // default
    await w.find('textarea').setValue('Setuju')
    await w.find('select').setValue('PUBLIC')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith(5, { content: 'Setuju', privacy: 'PUBLIC' })
    expect(w.emitted('shared')).toEqual([[created]])
  })

  it('boleh tanpa teks', async () => {
    const spy = vi.spyOn(postsApi, 'share').mockResolvedValue(mkPost())
    const w = mount(SharePanel, { props: { postId: 5 } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith(5, { content: '', privacy: 'FRIENDS' })
  })

  it('galat server ditampilkan, tidak memancarkan apa pun; kirim ganda diabaikan saat menunggu', async () => {
    const spy = vi
      .spyOn(postsApi, 'share')
      .mockRejectedValue(new ApiRequestError(404, 'NOT_FOUND', ['Post tidak ditemukan']))
    const w = mount(SharePanel, { props: { postId: 5 } })
    await Promise.all([w.find('form').trigger('submit'), w.find('form').trigger('submit')])
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(w.find('[role="alert"]').text()).toBe('Post tidak ditemukan')
    expect(w.emitted('shared')).toBeUndefined()
  })

  it('Cancel memancarkan cancel', async () => {
    const w = mount(SharePanel, { props: { postId: 5 } })
    await w
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)
  })
})

describe('SharedPostCard', () => {
  it('menampilkan penulis, waktu, dan isi asal sebagai teks (bukan HTML)', () => {
    const evil = '<img src=x onerror="window.__sh=1">'
    const w = mount(SharedPostCard, {
      props: {
        original: {
          id: 3,
          author,
          content: evil,
          imageUrl: '/uploads/a.png',
          createdAt: new Date().toISOString(),
        },
      },
      global: { plugins: [router()] },
    })
    expect(w.find('.shared__name').attributes('href')).toBe('/siti')
    expect(w.find('.shared__text').text()).toBe(evil)
    expect(w.find('.shared__text img').exists()).toBe(false)
    expect(w.find('img.shared__image').attributes('alt')).toBe('Photo posted by Siti')
  })

  it('tidak tersedia: hanya pesan, tanpa nama atau isi', () => {
    const w = mount(SharedPostCard, {
      props: { original: { unavailable: true } },
      global: { plugins: [router()] },
    })
    expect(w.text()).toBe("This post isn't available.")
    expect(w.find('.shared__name').exists()).toBe(false)
  })
})

describe('PostCard: share', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'budi', displayName: 'Budi' }
    vi.restoreAllMocks()
  })
  const mountCard = (post: Post) =>
    mount(PostCard, { props: { post }, global: { plugins: [router()] } })

  it('aksi Share membuka dan menutup panel; Share berhasil memancarkan post baru dan menutup panel', async () => {
    const created = mkPost({ id: 20 })
    vi.spyOn(postsApi, 'share').mockResolvedValue(created)
    const w = mountCard(mkPost())
    expect(w.find('.share').exists()).toBe(false)
    await w
      .findAll('.actions__link')
      .find((b) => b.text() === 'Share')!
      .trigger('click')
    expect(w.find('.share').exists()).toBe(true)
    await w.find('.share').trigger('submit')
    await flushPromises()
    expect(w.emitted('shared')).toEqual([[created]])
    expect(w.find('.share').exists()).toBe(false)
  })

  it('post biasa tanpa kartu sematan; share menampilkan post asal; asal hilang menampilkan pesan', () => {
    expect(mountCard(mkPost()).find('.shared').exists()).toBe(false)
    const withOriginal = mountCard(
      mkPost({
        content: 'komentarku',
        sharedFrom: {
          id: 3,
          author,
          content: 'isi asal',
          imageUrl: null,
          createdAt: new Date().toISOString(),
        },
      }),
    )
    expect(withOriginal.find('.post__text').text()).toBe('komentarku')
    expect(withOriginal.find('.shared__text').text()).toBe('isi asal')
    const gone = mountCard(mkPost({ content: '', sharedFrom: { unavailable: true } }))
    expect(gone.find('.post__text').exists()).toBe(false) // tanpa komentar: tidak ada paragraf kosong
    expect(gone.find('.shared__gone').text()).toBe("This post isn't available.")
  })
})
