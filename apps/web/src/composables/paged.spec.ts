import { describe, expect, it, vi } from 'vitest'
import { usePaged } from '@/composables/paged'

type Item = { id: number }
const page = (ids: number[], nextCursor: number | null, total?: number) => ({
  items: ids.map((id) => ({ id })),
  nextCursor,
  total,
})
const make = (fetch: (c: number | null) => Promise<ReturnType<typeof page>>) =>
  usePaged<Item>(fetch, (i) => i.id)

describe('usePaged', () => {
  it('memuat halaman berurutan dengan kursor, tanpa duplikat, mencatat total', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(page([3, 2], 2, 3))
      .mockResolvedValueOnce(page([2, 1], null, 3))
    const l = make(fetch)
    await l.loadMore()
    await l.loadMore()
    await l.loadMore() // sudah habis
    expect(l.items.value.map((i) => i.id)).toEqual([3, 2, 1])
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([null, 2])
    expect(l.done.value).toBe(true)
    expect(l.total.value).toBe(3)
  })

  it('panggilan bersamaan hanya memuat sekali', async () => {
    const fetch = vi.fn().mockResolvedValue(page([1], null))
    const l = make(fetch)
    await Promise.all([l.loadMore(), l.loadMore(), l.loadMore()])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('gagal: failed true, bisa dicoba lagi', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(page([1], null))
    const l = make(fetch)
    await l.loadMore()
    expect(l.failed.value).toBe(true)
    await l.loadMore()
    expect(l.failed.value).toBe(false)
    expect(l.items.value).toHaveLength(1)
  })

  it('reset membuang respons yang tertunda dan mengosongkan semuanya', async () => {
    let release!: (p: ReturnType<typeof page>) => void
    const fetch = vi.fn().mockReturnValue(new Promise((r) => (release = r)))
    const l = make(fetch)
    const pending = l.loadMore()
    l.reset()
    release(page([9], null, 1))
    await pending
    expect(l.items.value).toEqual([])
    expect(l.loading.value).toBe(false)
    expect(l.total.value).toBe(0)
  })
})
