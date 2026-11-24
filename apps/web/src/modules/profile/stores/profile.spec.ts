import type { Paged, Post, Profile } from '@retrobook/shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { friendsApi } from '@/modules/friends/services/api'
import { meApi } from '@/modules/profile/services/me'
import { useAuthStore } from '@/modules/auth/stores'
import { ApiRequestError } from '@/plugins/http'
import { usersApi } from '@/modules/profile/services/api'
import { useProfileStore } from '@/modules/profile/stores'

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 7,
  username: 'siti',
  displayName: 'Siti',
  avatarUrl: null,
  isBot: false,
  coverUrl: null,
  bio: null,
  birthday: null,
  hometown: null,
  currentCity: null,
  workplace: null,
  school: null,
  friendCount: 3,
  relationship: 'NONE',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})
const post = (id: number): Post => ({ id, content: `p${id}` }) as Post
const page = (ids: number[], next: number | null = null): Paged<Post> => ({
  items: ids.map(post),
  nextCursor: next,
})

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('load: memuat profil lalu timeline dengan username yang benar', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    const tl = vi.spyOn(usersApi, 'timeline').mockResolvedValue(page([2, 1]))
    const s = useProfileStore()
    await s.load('siti')
    await vi.waitFor(() => expect(s.timeline.items.map((p) => p.id)).toEqual([2, 1]))
    expect(s.state).toBe('ready')
    expect(tl).toHaveBeenCalledWith('siti', null)
  })

  it('404: unavailable tanpa memuat timeline; galat lain: error', async () => {
    const tl = vi.spyOn(usersApi, 'timeline')
    const prof = vi
      .spyOn(usersApi, 'profile')
      .mockRejectedValueOnce(new ApiRequestError(404, 'NOT_FOUND', ['x']))
    const s = useProfileStore()
    await s.load('hantu')
    expect(s.state).toBe('unavailable')
    expect(tl).not.toHaveBeenCalled()
    prof.mockRejectedValueOnce(new Error('network'))
    s.reset()
    await s.load('x')
    expect(s.state).toBe('error')
  })

  it('membuka profil yang sama lagi (pindah tab) tidak memuat ulang', async () => {
    const prof = vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    vi.spyOn(usersApi, 'timeline').mockResolvedValue(page([]))
    const s = useProfileStore()
    await s.load('siti')
    await s.load('SITI')
    expect(prof).toHaveBeenCalledTimes(1)
  })

  it('berpindah profil: respons profil lama yang terlambat dibuang', async () => {
    let releaseOld!: (p: Profile) => void
    vi.spyOn(usersApi, 'profile')
      .mockImplementationOnce(() => new Promise((r) => (releaseOld = r)))
      .mockResolvedValueOnce(profile({ id: 8, username: 'budi', displayName: 'Budi' }))
    vi.spyOn(usersApi, 'timeline').mockResolvedValue(page([]))
    const s = useProfileStore()
    const old = s.load('siti')
    await s.load('budi')
    releaseOld(profile())
    await old
    expect(s.profile?.username).toBe('budi')
  })

  describe('relate', () => {
    const ready = async (rel: Profile['relationship'], friendCount = 3) => {
      vi.spyOn(usersApi, 'profile').mockResolvedValue(profile({ relationship: rel, friendCount }))
      vi.spyOn(usersApi, 'timeline').mockResolvedValue(page([]))
      const s = useProfileStore()
      await s.load('siti')
      return s
    }

    it('send: NONE -> REQUEST_SENT; permintaan silang langsung FRIENDS (+1 teman)', async () => {
      const send = vi
        .spyOn(friendsApi, 'send')
        .mockResolvedValueOnce({ userId: 7, status: 'PENDING' })
      const s = await ready('NONE')
      expect(await s.relate('send')).toBe(true)
      expect(send).toHaveBeenCalledWith(7)
      expect(s.profile?.relationship).toBe('REQUEST_SENT')
      expect(s.profile?.friendCount).toBe(3)

      send.mockResolvedValueOnce({ userId: 7, status: 'ACCEPTED' })
      const s2 = await (async () => (setActivePinia(createPinia()), ready('NONE')))()
      await s2.relate('send')
      expect(s2.profile?.relationship).toBe('FRIENDS')
      expect(s2.profile?.friendCount).toBe(4)
    })

    it('cancel dan reject: kembali NONE; accept: FRIENDS dan +1; unfriend: NONE dan -1', async () => {
      vi.spyOn(friendsApi, 'reject').mockResolvedValue(undefined)
      vi.spyOn(friendsApi, 'accept').mockResolvedValue({ userId: 7, status: 'ACCEPTED' })
      vi.spyOn(friendsApi, 'unfriend').mockResolvedValue(undefined)

      let s = await ready('REQUEST_SENT')
      await s.relate('cancel')
      expect(s.profile?.relationship).toBe('NONE')

      setActivePinia(createPinia())
      s = await ready('REQUEST_RECEIVED')
      await s.relate('reject')
      expect(s.profile?.relationship).toBe('NONE')

      setActivePinia(createPinia())
      s = await ready('REQUEST_RECEIVED')
      await s.relate('accept')
      expect(s.profile).toMatchObject({ relationship: 'FRIENDS', friendCount: 4 })

      setActivePinia(createPinia())
      s = await ready('FRIENDS', 5)
      await s.relate('unfriend')
      expect(s.profile).toMatchObject({ relationship: 'NONE', friendCount: 4 })
    })

    it('gagal: hubungan tidak berubah, actionFailed true', async () => {
      vi.spyOn(friendsApi, 'send').mockRejectedValue(new Error('x'))
      const s = await ready('NONE')
      expect(await s.relate('send')).toBe(false)
      expect(s.profile?.relationship).toBe('NONE')
      expect(s.actionFailed).toBe(true)
    })
  })

  describe('uploadPhoto', () => {
    const png = () => new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })
    const ready = async () => {
      vi.spyOn(usersApi, 'profile').mockResolvedValue(
        profile({ id: 1, username: 'me', relationship: 'SELF' }),
      )
      vi.spyOn(usersApi, 'timeline').mockResolvedValue(page([]))
      useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
      const s = useProfileStore()
      await s.load('me')
      return s
    }

    it('avatar: memperbarui profil dan sesi (navbar), mengembalikan null', async () => {
      const up = vi
        .spyOn(meApi, 'uploadAvatar')
        .mockResolvedValue(profile({ id: 1, avatarUrl: '/uploads/a.png' }))
      const s = await ready()
      expect(await s.uploadPhoto('avatar', png())).toBeNull()
      expect(up).toHaveBeenCalled()
      expect(s.profile?.avatarUrl).toBe('/uploads/a.png')
      expect(useAuthStore().user?.avatarUrl).toBe('/uploads/a.png')
    })

    it('cover: memperbarui cover saja; sesi tidak berubah', async () => {
      vi.spyOn(meApi, 'uploadCover').mockResolvedValue(
        profile({ id: 1, coverUrl: '/uploads/c.png' }),
      )
      const s = await ready()
      expect(await s.uploadPhoto('cover', png())).toBeNull()
      expect(s.profile?.coverUrl).toBe('/uploads/c.png')
      expect(useAuthStore().user?.avatarUrl).toBeUndefined()
    })

    it('tipe salah atau terlalu besar: pesan galat tanpa memanggil server', async () => {
      const up = vi.spyOn(meApi, 'uploadAvatar')
      const s = await ready()
      expect(
        await s.uploadPhoto('avatar', new File(['x'], 'a.gif', { type: 'image/gif' })),
      ).toContain('JPG, PNG, or WebP')
      expect(
        await s.uploadPhoto(
          'avatar',
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' }),
        ),
      ).toContain('5 MB')
      expect(up).not.toHaveBeenCalled()
    })

    it('galat server: mengembalikan pesannya dan tidak mengubah apa pun', async () => {
      vi.spyOn(meApi, 'uploadAvatar').mockRejectedValue(
        new ApiRequestError(415, 'UNSUPPORTED_MEDIA_TYPE', [
          'Hanya JPG, PNG, atau WebP yang diizinkan',
        ]),
      )
      const s = await ready()
      expect(await s.uploadPhoto('avatar', png())).toBe('Hanya JPG, PNG, atau WebP yang diizinkan')
      expect(s.profile?.avatarUrl).toBeNull()
    })
  })
})
