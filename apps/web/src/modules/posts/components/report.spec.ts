import type { Comment, Post } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores'
import CommentList from '@/modules/posts/components/CommentList.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import ReportDialog from '@/modules/posts/components/ReportDialog.vue'
import { commentsApi } from '@/modules/posts/services/comments'
import { reportsApi } from '@/modules/posts/services/reports'
import { ApiRequestError } from '@/plugins/http'

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })
const stubs = { teleport: true }
const receipt = {
  id: '1',
  targetType: 'POST',
  targetId: '5',
  reason: 'SPAM',
  createdAt: '',
} as const

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
  useAuthStore().user = { id: '1', username: 'me', displayName: 'Me' }
})

describe('ReportDialog (INT-04)', () => {
  const open = () =>
    mount(ReportDialog, {
      props: { targetType: 'POST', targetId: '5' },
      global: { stubs },
    })

  it('Submit nonaktif sampai alasan dipilih; mengirim alasan dan catatan yang dirapikan', async () => {
    const create = vi.spyOn(reportsApi, 'create').mockResolvedValue(receipt)
    const w = open()
    expect(w.find('h2').text()).toBe('Report this post')
    const submit = () => w.find('button[type="submit"]')
    expect(submit().attributes('disabled')).toBeDefined()
    await w.find('input[value="SPAM"]').setValue()
    await w.find('textarea').setValue('  iklan  ')
    expect(submit().attributes('disabled')).toBeUndefined()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({
      targetType: 'POST',
      targetId: '5',
      reason: 'SPAM',
      note: 'iklan',
    })
    expect(w.text()).toContain('Thanks for letting us know')
    expect(w.find('form').exists()).toBe(false)
  })

  it('tanpa catatan: field note tidak dikirim', async () => {
    const create = vi.spyOn(reportsApi, 'create').mockResolvedValue(receipt)
    const w = open()
    await w.find('input[value="OTHER"]').setValue()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({ targetType: 'POST', targetId: '5', reason: 'OTHER' })
  })

  it.each([
    [new ApiRequestError(409, 'ALREADY_REPORTED', ['x']), 'You have already reported this.'],
    [new ApiRequestError(404, 'NOT_FOUND', ['x']), 'This is no longer available.'],
  ])('galat %#: pesan khusus menggantikan formulir', async (err, text) => {
    vi.spyOn(reportsApi, 'create').mockRejectedValue(err)
    const w = open()
    await w.find('input[value="SPAM"]').setValue()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain(text)
    expect(w.find('form').exists()).toBe(false)
  })

  it('galat lain: pesan galat dan formulir tetap ada untuk dicoba lagi', async () => {
    vi.spyOn(reportsApi, 'create').mockRejectedValue(new Error('network'))
    const w = open()
    await w.find('input[value="SPAM"]').setValue()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Could not send your report')
    expect(w.find('form').exists()).toBe(true)
  })

  it('Cancel dan klik latar menutup', async () => {
    const w = open()
    const cancel = w.findAll('button').find((b) => b.text() === 'Cancel')!
    await cancel.trigger('click')
    await w.find('.report__backdrop').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
  })
})

describe('titik masuk Report', () => {
  const post = (authorId: string): Post =>
    ({
      id: '5',
      author: {
        id: authorId,
        username: `u${authorId}`,
        displayName: 'A',
        avatarUrl: null,
        isBot: false,
      },
      wallOwner: null,
      sharedFrom: null,
      content: 'isi',
      imageUrl: null,
      feeling: null,
      privacy: 'PUBLIC',
      tags: [],
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      savedByMe: false,
      likedPreview: [],
      editedAt: null,
      createdAt: new Date().toISOString(),
    }) as Post

  it('PostCard: Report dari menu membuka dialog untuk post itu dan menutup menu', async () => {
    const w = mount(PostCard, {
      props: { post: post('2') },
      global: { plugins: [router()], stubs },
    })
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    await w.find('.post__dots').trigger('click')
    await w.find('.post__item').trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    expect(w.find('h2').text()).toBe('Report this post')
    expect(w.find('.post__dropdown').exists()).toBe(false)
  })

  it('PostCard: post sendiri tidak punya Report', async () => {
    const w = mount(PostCard, {
      props: { post: post('1') },
      global: { plugins: [router()], stubs },
    })
    await w.find('.post__dots').trigger('click')
    expect(w.findAll('.post__item').map((b) => b.text())).toEqual(['Edit', 'Delete'])
  })

  it('CommentList: Report hanya pada komentar orang lain, membuka dialog untuk komentar itu', async () => {
    const mk = (id: string, authorId: string): Comment =>
      ({
        id,
        postId: '5',
        author: {
          id: authorId,
          username: `u${authorId}`,
          displayName: `U${authorId}`,
          avatarUrl: null,
          isBot: false,
        },
        content: `k${id}`,
        imageUrl: null,
        likeCount: 0,
        likedByMe: false,
        savedByMe: false,
        createdAt: new Date().toISOString(),
      }) as Comment
    vi.spyOn(commentsApi, 'list').mockResolvedValue({
      items: [mk('10', '1'), mk('11', '2')],
      nextCursor: null,
    })
    const create = vi.spyOn(reportsApi, 'create').mockResolvedValue(receipt)
    const w = mount(CommentList, {
      props: { postId: '5', commentCount: 2, postAuthorId: '9' },
      global: { plugins: [router()], stubs },
    })
    await w.find('.comments__link').trigger('click')
    await flushPromises()
    const reports = w.findAll('.comment__meta .comments__link').filter((b) => b.text() === 'Report')
    expect(reports).toHaveLength(1) // komentar id 10 milik saya tidak punya Report
    await reports[0]!.trigger('click')
    expect(w.find('h2').text()).toBe('Report this comment')
    await w.find('input[value="HARASSMENT"]').setValue()
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith({
      targetType: 'COMMENT',
      targetId: '11',
      reason: 'HARASSMENT',
    })
  })
})
