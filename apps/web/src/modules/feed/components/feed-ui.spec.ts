import type { Post } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import { useFeedStore } from '@/modules/feed/stores'
import PostCard from '@/modules/posts/components/PostCard.vue'
import StatusBox from '@/modules/feed/components/StatusBox.vue'

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })

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
  likedPreview: [],
  editedAt: null,
  createdAt: new Date().toISOString(),
  ...over,
})

describe('StatusBox', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('tombol Post nonaktif sampai ada teks atau foto; privasi default Friends', async () => {
    const w = mount(StatusBox)
    const btn = () => w.find('button[type="submit"]')
    expect(btn().attributes('disabled')).toBeDefined()
    expect((w.find('select').element as HTMLSelectElement).value).toBe('FRIENDS')
    await w.find('textarea').setValue('   ')
    expect(btn().attributes('disabled')).toBeDefined()
    await w.find('textarea').setValue('halo')
    expect(btn().attributes('disabled')).toBeUndefined()
  })

  it('kirim: memanggil API dengan privasi terpilih, menambah ke feed, membersihkan form', async () => {
    const created = mkPost({ id: 10, content: 'baru', privacy: 'PUBLIC' })
    const spy = vi.spyOn(postsApi, 'create').mockResolvedValue(created)
    const w = mount(StatusBox)
    await w.find('textarea').setValue('baru')
    await w.find('select').setValue('PUBLIC')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith({ content: 'baru', privacy: 'PUBLIC', imageUrl: null })
    expect(useFeedStore().items[0]?.id).toBe(10)
    expect((w.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('galat server ditampilkan dan teks tidak hilang', async () => {
    vi.spyOn(postsApi, 'create').mockRejectedValue(
      new ApiRequestError(400, 'VALIDATION_FAILED', ['Terlalu panjang']),
    )
    const w = mount(StatusBox)
    await w.find('textarea').setValue('x')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Terlalu panjang')
    expect((w.find('textarea').element as HTMLTextAreaElement).value).toBe('x')
  })

  it('foto: tipe salah dan terlalu besar ditolak tanpa memanggil server', async () => {
    const up = vi.spyOn(postsApi, 'uploadImage')
    const w = mount(StatusBox)
    const input = w.find('input[type="file"]')
    const pick = async (file: File) => {
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      await flushPromises()
    }
    await pick(new File(['x'], 'a.gif', { type: 'image/gif' }))
    expect(w.find('[role="alert"]').text()).toContain('JPG, PNG, or WebP')
    await pick(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }))
    expect(w.find('[role="alert"]').text()).toContain('5 MB')
    expect(up).not.toHaveBeenCalled()
  })

  it('foto valid: diunggah, pratinjau tampil, post boleh dikirim tanpa teks', async () => {
    vi.spyOn(postsApi, 'uploadImage').mockResolvedValue({ url: '/uploads/a.png' })
    const create = vi
      .spyOn(postsApi, 'create')
      .mockResolvedValue(mkPost({ id: 2, imageUrl: '/uploads/a.png' }))
    const w = mount(StatusBox)
    const input = w.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['x'], 'a.png', { type: 'image/png' })],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    expect(w.find('.status__preview img').attributes('src')).toBe('/uploads/a.png')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({
      content: '',
      privacy: 'FRIENDS',
      imageUrl: '/uploads/a.png',
    })
  })
})

describe('PostCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'budi', displayName: 'Budi' }
  })

  it('isi ditampilkan sebagai teks, bukan HTML (XSS)', () => {
    const evil = '<img src=x onerror="window.__pwn=1"><script>window.__pwn=1</script>'
    const w = mount(PostCard, {
      props: { post: mkPost({ content: evil }) },
      global: { plugins: [router()] },
    })
    expect(w.find('.post__text').text()).toBe(evil)
    expect(w.find('.post__text img').exists()).toBe(false)
    expect((window as unknown as { __pwn?: number }).__pwn).toBeUndefined()
  })

  it('menampilkan penulis (tautan profil), privasi, dan tanda diedit', () => {
    const w = mount(PostCard, {
      props: { post: mkPost({ privacy: 'ONLY_ME', editedAt: new Date().toISOString() }) },
      global: { plugins: [router()] },
    })
    expect(w.find('.post__name').attributes('href')).toBe('/budi')
    expect(w.find('[role="img"][aria-label="Only me"]').exists()).toBe(true)
    expect(w.text()).toContain('Edited')
  })

  it('menu hapus dan edit hanya untuk post sendiri; post orang lain hanya punya Report', async () => {
    const mine = mount(PostCard, { props: { post: mkPost() }, global: { plugins: [router()] } })
    expect(mine.find('.post__dots').exists()).toBe(true)
    const theirs = mount(PostCard, {
      props: {
        post: mkPost({
          author: { id: 2, username: 'siti', displayName: 'Siti', avatarUrl: null, isBot: false },
        }),
      },
      global: { plugins: [router()] },
    })
    await theirs.find('.post__dots').trigger('click')
    expect(theirs.findAll('.post__item').map((b) => b.text())).toEqual(['Report'])
  })

  it('hapus: emit hanya setelah konfirmasi', async () => {
    const w = mount(PostCard, {
      props: { post: mkPost({ id: 7 }) },
      global: { plugins: [router()] },
    })
    const confirm = vi.spyOn(window, 'confirm')
    await w.find('.post__dots').trigger('click')
    confirm.mockReturnValueOnce(false)
    await w.findAll('.post__item')[1]!.trigger('click') // [0] = Edit, [1] = Delete
    expect(w.emitted('delete')).toBeUndefined()
    await w.find('.post__dots').trigger('click')
    confirm.mockReturnValueOnce(true)
    await w.findAll('.post__item')[1]!.trigger('click') // [0] = Edit, [1] = Delete
    expect(w.emitted('delete')).toEqual([[7]])
  })

  it('gambar punya alt; aksi Like berubah jadi Unlike; Like memancarkan event', async () => {
    const w = mount(PostCard, {
      props: { post: mkPost({ id: 4, imageUrl: '/uploads/a.png' }) },
      global: { plugins: [router()] },
    })
    expect(w.find('img.post__image').attributes('alt')).toBe('Photo posted by Budi')
    const like = w.find('.actions__link')
    expect(like.text()).toBe('Like')
    await like.trigger('click')
    expect(w.emitted('toggle-like')).toEqual([[4]])
    await w.setProps({ post: mkPost({ id: 4, likedByMe: true, likeCount: 1 }) })
    expect(w.find('.actions__link').text()).toBe('Unlike')
    expect(w.find('.likes').text()).toContain('You like this.')
  })
})
