import type { Paged, Post } from '@retrobook/shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postsApi } from '@/modules/posts/services/api'
import { useFeedStore } from '@/modules/feed/stores'

const post = (id: number): Post => ({
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
})
const page = (ids: number[], nextCursor: number | null): Paged<Post> => ({
  items: ids.map(post),
  nextCursor,
})

describe('feed store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('memuat halaman berurutan memakai kursor sampai habis', async () => {
    const spy = vi
      .spyOn(postsApi, 'feed')
      .mockResolvedValueOnce(page([3, 2], 2))
      .mockResolvedValueOnce(page([1], null))
    const feed = useFeedStore()
    await feed.loadMore()
    await feed.loadMore()
    expect(feed.items.map((p) => p.id)).toEqual([3, 2, 1])
    expect(spy.mock.calls.map((c) => c[0])).toEqual([null, 2])
    expect(feed.done).toBe(true)
    await feed.loadMore() // setelah habis: tidak memanggil server lagi
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('panggilan bersamaan hanya memuat sekali', async () => {
    const spy = vi.spyOn(postsApi, 'feed').mockResolvedValue(page([1], null))
    const feed = useFeedStore()
    await Promise.all([feed.loadMore(), feed.loadMore(), feed.loadMore()])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('post yang sudah ada tidak digandakan (post baru dari StatusBox lalu muncul di halaman)', async () => {
    vi.spyOn(postsApi, 'feed').mockResolvedValue(page([5, 4], null))
    const feed = useFeedStore()
    feed.prepend(post(5))
    await feed.loadMore()
    expect(feed.items.map((p) => p.id)).toEqual([5, 4])
  })

  it('gagal: failed true, bisa dicoba lagi', async () => {
    vi.spyOn(postsApi, 'feed')
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(page([1], null))
    const feed = useFeedStore()
    await feed.loadMore()
    expect(feed.failed).toBe(true)
    expect(feed.done).toBe(false)
    await feed.loadMore()
    expect(feed.failed).toBe(false)
    expect(feed.items).toHaveLength(1)
  })

  it('prepend, remove, dan reset', () => {
    const feed = useFeedStore()
    feed.prepend(post(1))
    feed.prepend(post(2))
    expect(feed.items.map((p) => p.id)).toEqual([2, 1])
    feed.remove(2)
    expect(feed.items.map((p) => p.id)).toEqual([1])
    feed.reset(7)
    expect(feed.items).toEqual([])
    expect(feed.ownerId).toBe(7)
  })

  it('hasil yang datang setelah akun berganti dibuang', async () => {
    let resolve!: (p: Paged<Post>) => void
    vi.spyOn(postsApi, 'feed').mockReturnValue(new Promise((r) => (resolve = r)))
    const feed = useFeedStore()
    feed.reset(1)
    const pending = feed.loadMore()
    feed.reset(2)
    resolve(page([9], null))
    await pending
    expect(feed.items).toEqual([])
  })

  describe('toggleLike (optimistik)', () => {
    const setup = (over: Partial<Post> = {}) => {
      const feed = useFeedStore()
      feed.prepend({ ...post(1), ...over })
      return feed
    }

    it('like: tampilan berubah dulu, lalu memakai angka server', async () => {
      let release!: () => void
      vi.spyOn(postsApi, 'like').mockReturnValue(
        new Promise((r) => (release = () => r({ likeCount: 5, likedByMe: true }))),
      )
      const feed = setup({ likeCount: 2 })
      const pending = feed.toggleLike(1)
      expect(feed.items[0]).toMatchObject({ likeCount: 3, likedByMe: true }) // sebelum server menjawab
      release()
      expect(await pending).toBe(true)
      expect(feed.items[0]).toMatchObject({ likeCount: 5, likedByMe: true })
    })

    it('unlike memanggil DELETE dan menurunkan jumlah (tidak di bawah 0)', async () => {
      const spy = vi.spyOn(postsApi, 'unlike').mockResolvedValue({ likeCount: 0, likedByMe: false })
      const feed = setup({ likeCount: 0, likedByMe: true })
      await feed.toggleLike(1)
      expect(spy).toHaveBeenCalledWith(1)
      expect(feed.items[0]).toMatchObject({ likeCount: 0, likedByMe: false })
    })

    it('gagal: dikembalikan ke keadaan semula dan mengembalikan false', async () => {
      vi.spyOn(postsApi, 'like').mockRejectedValue(new Error('x'))
      const feed = setup({ likeCount: 2 })
      expect(await feed.toggleLike(1)).toBe(false)
      expect(feed.items[0]).toMatchObject({ likeCount: 2, likedByMe: false })
    })

    it('klik berulang saat menunggu hanya mengirim satu permintaan', async () => {
      const spy = vi.spyOn(postsApi, 'like').mockResolvedValue({ likeCount: 1, likedByMe: true })
      const feed = setup()
      await Promise.all([feed.toggleLike(1), feed.toggleLike(1), feed.toggleLike(1)])
      expect(spy).toHaveBeenCalledTimes(1)
      expect(feed.items[0]?.likeCount).toBe(1)
    })

    it('post yang tidak ada di feed diabaikan', async () => {
      const spy = vi.spyOn(postsApi, 'like')
      await useFeedStore().toggleLike(404)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  it('adjustComments menaikkan dan menurunkan jumlah, tidak di bawah 0', () => {
    const feed = useFeedStore()
    feed.prepend({ ...post(1), commentCount: 1 })
    feed.adjustComments(1, 2)
    expect(feed.items[0]?.commentCount).toBe(3)
    feed.adjustComments(1, -10)
    expect(feed.items[0]?.commentCount).toBe(0)
    feed.adjustComments(404, 1) // tidak ada: diabaikan
  })
})
