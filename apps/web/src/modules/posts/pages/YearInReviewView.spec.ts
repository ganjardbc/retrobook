import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postsApi } from '@/modules/posts/services/api'
import YearInReviewView from './YearInReviewView.vue'

const base = {
  year: 2014,
  years: [2014, 2013],
  postCount: 3,
  photoCount: 1,
  likeCount: 5,
  commentCount: 2,
  topPost: null,
}
const mountView = () =>
  mount(YearInReviewView, {
    global: { plugins: [createPinia()], stubs: { PostCard: true, RouterLink: true } },
  })

describe('YearInReviewView (YIR-01)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('menampilkan angka dan memuat tahun lain saat dipilih', async () => {
    const spy = vi.spyOn(postsApi, 'yearInReview').mockResolvedValue(base)
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('5')
    await w.findAll('.yir__year')[1]!.trigger('click')
    expect(spy).toHaveBeenLastCalledWith(2013)
  })

  it('tahun tanpa post menampilkan pesan kosong; gagal menampilkan error', async () => {
    vi.spyOn(postsApi, 'yearInReview').mockResolvedValueOnce({ ...base, postCount: 0 })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('did not post anything in 2014')
    vi.spyOn(postsApi, 'yearInReview').mockRejectedValueOnce(new Error('x'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[role=alert]').exists()).toBe(true)
  })
})
