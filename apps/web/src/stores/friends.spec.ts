import type { FriendRequest, FriendsPage, Paged, UserSummary } from '@retrobook/shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { friendsApi } from '../api/friends'
import { useFriendsStore } from './friends'

const user = (id: number, name = `User${id}`): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const req = (id: number): FriendRequest => ({
  user: user(id),
  createdAt: '2026-11-24T00:00:00.000Z',
})
const reqPage = (ids: number[], next: number | null): Paged<FriendRequest> => ({
  items: ids.map(req),
  nextCursor: next,
})
const friendPage = (ids: number[], next: number | null, total = ids.length): FriendsPage => ({
  items: ids.map((i) => user(i)),
  nextCursor: next,
  total,
})

describe('friends store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('memuat permintaan masuk berhalaman tanpa duplikat sampai habis', async () => {
    const spy = vi
      .spyOn(friendsApi, 'requests')
      .mockResolvedValueOnce(reqPage([3, 2], 2))
      .mockResolvedValueOnce(reqPage([2, 1], null))
    const s = useFriendsStore()
    await s.loadRequests()
    await s.loadRequests()
    await s.loadRequests() // sudah habis
    expect(s.requests.map((r) => r.user.id)).toEqual([3, 2, 1])
    expect(spy.mock.calls.map((c) => c[0])).toEqual([null, 2])
    expect(s.requestsDone).toBe(true)
  })

  it('memuat daftar teman berhalaman dan menyimpan total', async () => {
    const spy = vi
      .spyOn(friendsApi, 'list')
      .mockResolvedValueOnce(friendPage([5, 4], 4, 3))
      .mockResolvedValueOnce(friendPage([3], null, 3))
    const s = useFriendsStore()
    await s.loadFriends()
    await s.loadFriends()
    expect(s.friends.map((u) => u.id)).toEqual([5, 4, 3])
    expect(s.total).toBe(3)
    expect(spy.mock.calls[1]).toEqual([4, ''])
  })

  it('panggilan bersamaan hanya memuat sekali', async () => {
    const spy = vi.spyOn(friendsApi, 'list').mockResolvedValue(friendPage([1], null))
    const s = useFriendsStore()
    await Promise.all([s.loadFriends(), s.loadFriends(), s.loadFriends()])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('terima: permintaan pindah ke atas daftar teman, total +1, tanpa muat ulang', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue(reqPage([7], null))
    vi.spyOn(friendsApi, 'list').mockResolvedValue(friendPage([1], null, 1))
    const accept = vi
      .spyOn(friendsApi, 'accept')
      .mockResolvedValue({ userId: 7, status: 'ACCEPTED' })
    const s = useFriendsStore()
    await s.loadRequests()
    await s.loadFriends()
    expect(await s.accept(7)).toBe(true)
    expect(accept).toHaveBeenCalledWith(7)
    expect(s.requests).toEqual([])
    expect(s.friends.map((u) => u.id)).toEqual([7, 1])
    expect(s.total).toBe(2)
  })

  it('terima gagal: tidak ada yang berubah dan mengembalikan false', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue(reqPage([7], null))
    vi.spyOn(friendsApi, 'accept').mockRejectedValue(new Error('x'))
    const s = useFriendsStore()
    await s.loadRequests()
    expect(await s.accept(7)).toBe(false)
    expect(s.requests).toHaveLength(1)
    expect(s.total).toBe(0)
  })

  it('terima saat sedang memfilter: teman baru yang tidak cocok tidak ditampilkan tapi total naik', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue(reqPage([7], null))
    vi.spyOn(friendsApi, 'list').mockResolvedValue(friendPage([], null, 0))
    vi.spyOn(friendsApi, 'accept').mockResolvedValue({ userId: 7, status: 'ACCEPTED' })
    const s = useFriendsStore()
    await s.loadRequests()
    await s.search('zzz')
    await s.accept(7)
    expect(s.friends).toEqual([])
    expect(s.total).toBe(1)
  })

  it('tolak menghapus permintaan; unfriend menghapus teman dan menurunkan total', async () => {
    vi.spyOn(friendsApi, 'requests').mockResolvedValue(reqPage([7], null))
    vi.spyOn(friendsApi, 'list').mockResolvedValue(friendPage([1, 2], null, 2))
    const reject = vi.spyOn(friendsApi, 'reject').mockResolvedValue(undefined)
    const unfriend = vi.spyOn(friendsApi, 'unfriend').mockResolvedValue(undefined)
    const s = useFriendsStore()
    await s.loadRequests()
    await s.loadFriends()
    await s.reject(7)
    await s.unfriend(1)
    expect(reject).toHaveBeenCalledWith(7)
    expect(unfriend).toHaveBeenCalledWith(1)
    expect(s.requests).toEqual([])
    expect(s.friends.map((u) => u.id)).toEqual([2])
    expect(s.total).toBe(1)
  })

  it('pencarian: mengosongkan daftar, memuat dari awal dengan q; hasil pencarian lama dibuang', async () => {
    let releaseOld!: (p: FriendsPage) => void
    const list = vi
      .spyOn(friendsApi, 'list')
      .mockImplementationOnce(() => new Promise((r) => (releaseOld = r)))
      .mockResolvedValueOnce(friendPage([9], null, 1))
    const s = useFriendsStore()
    const old = s.search('bu')
    const fresh = s.search('budi')
    await fresh
    releaseOld(friendPage([1, 2, 3], null, 3)) // jawaban pencarian lama datang terlambat
    await old
    expect(s.friends.map((u) => u.id)).toEqual([9])
    expect(s.total).toBe(1)
    expect(list.mock.calls.map((c) => c[1])).toEqual(['bu', 'budi'])
  })

  it('reset (ganti akun): kosong total, respons yang tertunda dibuang', async () => {
    let release!: (p: FriendsPage) => void
    vi.spyOn(friendsApi, 'list').mockReturnValue(new Promise((r) => (release = r)))
    const s = useFriendsStore()
    s.reset(1)
    const pending = s.loadFriends()
    s.reset(2)
    release(friendPage([9], null))
    await pending
    expect(s.friends).toEqual([])
    expect(s.ownerId).toBe(2)
  })

  it('gagal memuat: failed true dan bisa dicoba lagi', async () => {
    vi.spyOn(friendsApi, 'list')
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(friendPage([1], null))
    const s = useFriendsStore()
    await s.loadFriends()
    expect(s.friendsFailed).toBe(true)
    await s.loadFriends()
    expect(s.friendsFailed).toBe(false)
    expect(s.friends).toHaveLength(1)
  })
})
