import type { Comment } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { commentsApi } from '@/modules/posts/services/comments'
import { ApiRequestError } from '@/plugins/http'
import { useAuthStore } from '@/modules/auth/stores'
import CommentList from '@/modules/posts/components/CommentList.vue'

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })

const mk = (id: number, authorId = 2, content = `komentar ${id}`): Comment => ({
  id,
  postId: 1,
  author: {
    id: authorId,
    username: `u${authorId}`,
    displayName: `User${authorId}`,
    avatarUrl: null,
    isBot: false,
  },
  content,
  imageUrl: null,
  likeCount: 0,
  likedByMe: false,
  createdAt: new Date().toISOString(),
})

const mount_ = (props: { commentCount: number; postAuthorId?: number }) =>
  mount(CommentList, {
    props: { postId: 1, postAuthorId: props.postAuthorId ?? 9, commentCount: props.commentCount },
    global: { plugins: [router()] },
  })

describe('CommentList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 5, username: 'me', displayName: 'Me' }
    vi.restoreAllMocks()
  })

  it('tertutup: tautan "View N comments"; tidak memanggil server sebelum diklik', () => {
    const spy = vi.spyOn(commentsApi, 'list')
    expect(mount_({ commentCount: 3 }).text()).toContain('View 3 comments')
    expect(mount_({ commentCount: 1 }).text()).toContain('View 1 comment')
    expect(mount_({ commentCount: 0 }).text()).not.toContain('View')
    expect(spy).not.toHaveBeenCalled()
  })

  it('buka: memuat halaman pertama lama ke baru, isi sebagai teks', async () => {
    vi.spyOn(commentsApi, 'list').mockResolvedValue({
      items: [mk(1, 2, '<img src=x onerror="window.__c=1">'), mk(2)],
      nextCursor: null,
    })
    const w = mount_({ commentCount: 2 })
    await w.find('.comments__link').trigger('click')
    await flushPromises()
    const texts = w.findAll('.comment__text').map((n) => n.text())
    expect(texts[0]).toContain('<img src=x onerror="window.__c=1">')
    expect(w.find('.comment__text img').exists()).toBe(false)
    expect(w.findAll('.comment')).toHaveLength(2)
    expect(w.text()).not.toContain('View 2 comments') // tautan hilang setelah dibuka
  })

  it('"View more comments" memuat halaman berikutnya dengan kursor tanpa duplikat', async () => {
    const list = vi
      .spyOn(commentsApi, 'list')
      .mockResolvedValueOnce({ items: [mk(1), mk(2)], nextCursor: 2 })
      .mockResolvedValueOnce({ items: [mk(2), mk(3)], nextCursor: null })
    const w = mount_({ commentCount: 3 })
    await w.find('.comments__link').trigger('click')
    await flushPromises()
    const more = w.findAll('.comments__link').find((b) => b.text() === 'View more comments')!
    await more.trigger('click')
    await flushPromises()
    expect(list.mock.calls[1]![1]).toBe(2)
    expect(w.findAll('.comment')).toHaveLength(3)
    expect(w.findAll('.comments__link').some((b) => b.text() === 'View more comments')).toBe(false)
  })

  it('kirim: Enter mengirim, komentar muncul, input dikosongkan, jumlah +1', async () => {
    const create = vi.spyOn(commentsApi, 'create').mockResolvedValue(mk(10, 5, 'halo'))
    const w = mount_({ commentCount: 0 })
    await w.find('input').setValue('halo')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(1, 'halo')
    expect(w.findAll('.comment')).toHaveLength(1)
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
    expect(w.emitted('count-change')).toEqual([[1]])
  })

  it('kosong atau spasi saja tidak dikirim', async () => {
    const create = vi.spyOn(commentsApi, 'create')
    const w = mount_({ commentCount: 0 })
    await w.find('input').setValue('   ')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
  })

  it('kirim saat sudah ada komentar lain dan daftar belum dibuka: daftar dimuat dari awal', async () => {
    vi.spyOn(commentsApi, 'create').mockResolvedValue(mk(3, 5, 'baru'))
    const list = vi
      .spyOn(commentsApi, 'list')
      .mockResolvedValue({ items: [mk(1), mk(2), mk(3, 5, 'baru')], nextCursor: null })
    const w = mount_({ commentCount: 2 })
    await w.find('input').setValue('baru')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(list).toHaveBeenCalled()
    expect(
      w
        .findAll('.comment')
        .map((c) => c.text())
        .at(-1),
    ).toContain('baru')
  })

  it('galat server ditampilkan dan teks tetap ada', async () => {
    vi.spyOn(commentsApi, 'create').mockRejectedValue(
      new ApiRequestError(404, 'NOT_FOUND', ['Post tidak ditemukan']),
    )
    const w = mount_({ commentCount: 0 })
    await w.find('input').setValue('halo')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Post tidak ditemukan')
    expect((w.find('input').element as HTMLInputElement).value).toBe('halo')
  })

  it('hapus: hanya untuk komentar sendiri atau bila saya pemilik post', async () => {
    vi.spyOn(commentsApi, 'list').mockResolvedValue({
      items: [mk(1, 5), mk(2, 2)],
      nextCursor: null,
    })
    const asCommenter = mount_({ commentCount: 2, postAuthorId: 9 })
    await asCommenter.find('.comments__link').trigger('click')
    await flushPromises()
    const del = (w: typeof asCommenter) => w.findAll('.comment__meta .comments__link')
    expect(del(asCommenter)).toHaveLength(1) // hanya komentar milik saya (id 5)

    useAuthStore().user = { id: 9, username: 'owner', displayName: 'Owner' }
    const asOwner = mount_({ commentCount: 2, postAuthorId: 9 })
    await asOwner.find('.comments__link').trigger('click')
    await flushPromises()
    expect(del(asOwner)).toHaveLength(2) // pemilik post boleh menghapus semuanya
  })

  it('hapus: konfirmasi dulu; setelah berhasil komentar hilang dan jumlah -1', async () => {
    vi.spyOn(commentsApi, 'list').mockResolvedValue({ items: [mk(1, 5)], nextCursor: null })
    const remove = vi.spyOn(commentsApi, 'remove').mockResolvedValue(undefined)
    const w = mount_({ commentCount: 1 })
    await w.find('.comments__link').trigger('click')
    await flushPromises()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await w.find('.comment__meta .comments__link').trigger('click')
    expect(remove).not.toHaveBeenCalled()
    confirm.mockReturnValueOnce(true)
    await w.find('.comment__meta .comments__link').trigger('click')
    await flushPromises()
    expect(remove).toHaveBeenCalledWith(1)
    expect(w.findAll('.comment')).toHaveLength(0)
    expect(w.emitted('count-change')).toEqual([[-1]])
  })
})
