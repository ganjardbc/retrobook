import type { Profile, UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { usersApi } from '@/modules/profile/services/api'
import { albumsApi } from '@/modules/profile/services/albums'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'
import ProfileAbout from '@/modules/profile/pages/ProfileAbout.vue'
import ProfileFriends from '@/modules/profile/pages/ProfileFriends.vue'
import ProfilePhotos from '@/modules/profile/pages/ProfilePhotos.vue'
import ProfileNotes from '@/modules/profile/pages/ProfileNotes.vue'
import ProfileTimeline from '@/modules/profile/pages/ProfileTimeline.vue'
import ProfileView from '@/modules/profile/pages/ProfileView.vue'

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 7,
  username: 'siti',
  displayName: 'Siti Aminah',
  avatarUrl: null,
  isBot: false,
  coverUrl: null,
  bio: null,
  birthday: null,
  hometown: null,
  currentCity: null,
  workplace: null,
  school: null,
  friendCount: 8,
  relationship: 'NONE',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})
const user = (id: number): UserSummary => ({
  id,
  username: `u${id}`,
  displayName: `Teman ${id}`,
  avatarUrl: null,
  isBot: false,
})
const photo = (postId: number) => ({
  postId,
  url: `/uploads/${String(postId).repeat(32).slice(0, 32)}.png`,
  createdAt: '2026-11-24T00:00:00.000Z',
})

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:username',
        component: ProfileView,
        children: [
          { path: '', name: 'profile', component: ProfileTimeline },
          { path: 'about', name: 'profile-about', component: ProfileAbout },
          { path: 'friends', name: 'profile-friends', component: ProfileFriends },
          { path: 'photos', name: 'profile-photos', component: ProfilePhotos },
          { path: 'notes', name: 'profile-notes', component: ProfileNotes },
        ],
      },
    ],
  })
  await router.push(path)
  const w = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('tab Friends dan Photos profil', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.restoreAllMocks()
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    vi.spyOn(usersApi, 'timeline').mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(usersApi, 'friends').mockResolvedValue({
      items: [1, 2, 3, 4, 5, 6, 7, 8].map(user),
      nextCursor: null,
      total: 8,
    })
    vi.spyOn(usersApi, 'photos').mockResolvedValue({
      items: [1, 2, 3].map(photo),
      nextCursor: null,
    })
    vi.spyOn(albumsApi, 'forProfile').mockResolvedValue([])
  })

  it('tab Friends dan Photos adalah tautan ke rute masing-masing', async () => {
    const { w } = await mountAt('/siti')
    const hrefs = w.findAll('.tabs a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/siti', '/siti/notes', '/siti/about', '/siti/friends', '/siti/photos'])
  })

  it('kartu info menampilkan grid enam teman dengan jumlah total dan tautan ke tab Friends', async () => {
    const { w } = await mountAt('/siti')
    const grid = w.find('.grid')
    expect(grid.findAll('.grid__item')).toHaveLength(6)
    expect(grid.find('.grid__count').text()).toBe('8')
    expect(grid.find('.grid__head a').attributes('href')).toBe('/siti/friends')
    expect(grid.find('.grid__item a').attributes('href')).toBe('/u1')
  })

  it('tanpa teman: grid tidak muncul', async () => {
    vi.spyOn(usersApi, 'friends').mockResolvedValue({ items: [], nextCursor: null, total: 0 })
    const { w } = await mountAt('/siti')
    expect(w.find('.grid').exists()).toBe(false)
  })

  it('tab Friends: semua teman yang dimuat, tanpa memuat ulang pemuatan awal; aktif ditandai', async () => {
    const { w } = await mountAt('/siti/friends')
    expect(w.findAll('.friends__list .row')).toHaveLength(8)
    expect(w.find('.friends__head').text()).toContain('8')
    expect(w.find('.tabs__tab--active').text()).toContain('Friends')
    expect(usersApi.friends).toHaveBeenCalledTimes(1)
  })

  it('tab Friends: Load more memuat halaman berikutnya', async () => {
    const friends = vi
      .spyOn(usersApi, 'friends')
      .mockResolvedValueOnce({ items: [1, 2].map(user), nextCursor: 2, total: 3 })
      .mockResolvedValueOnce({ items: [3].map(user), nextCursor: null, total: 3 })
    const { w } = await mountAt('/siti/friends')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Load more')!
      .trigger('click')
    await flushPromises()
    expect(friends.mock.calls[1]![1]).toBe(2)
    expect(w.findAll('.friends__list .row')).toHaveLength(3)
    expect(w.findAll('button').some((b) => b.text() === 'Load more')).toBe(false)
  })

  it('tab Friends kosong menampilkan pesan', async () => {
    vi.spyOn(usersApi, 'friends').mockResolvedValue({ items: [], nextCursor: null, total: 0 })
    const { w } = await mountAt('/siti/friends')
    expect(w.text()).toContain('No friends to show.')
  })

  it('tab Photos: grid gambar dengan alt dan tautan ke gambar; dimuat saat tab dibuka', async () => {
    const { w } = await mountAt('/siti/photos')
    const links = w.findAll('.photos__link')
    expect(links).toHaveLength(3)
    expect(links[0]!.attributes('href')).toBe(photo(1).url)
    expect(links[0]!.attributes('rel')).toContain('noopener')
    expect(links[0]!.find('img').attributes('alt')).toBe('Photo from Siti Aminah')
  })

  it('tab Photos: kosong dan galat', async () => {
    vi.spyOn(usersApi, 'photos').mockResolvedValueOnce({ items: [], nextCursor: null })
    expect((await mountAt('/siti/photos')).w.text()).toContain('No photos to show.')
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.spyOn(usersApi, 'photos').mockRejectedValueOnce(new Error('x'))
    const failed = await mountAt('/siti/photos')
    expect(failed.w.text()).toContain('Try again')
  })

  it('pindah ke profil lain mengosongkan daftar teman dan foto profil sebelumnya', async () => {
    const { router } = await mountAt('/siti/photos')
    const store = useProfileStore()
    expect(store.photos.items).toHaveLength(3)
    vi.spyOn(usersApi, 'profile').mockResolvedValueOnce(
      profile({ id: 8, username: 'budi', displayName: 'Budi' }),
    )
    vi.spyOn(usersApi, 'photos').mockResolvedValueOnce({ items: [], nextCursor: null })
    vi.spyOn(usersApi, 'friends').mockResolvedValueOnce({ items: [], nextCursor: null, total: 0 })
    await router.push('/budi/photos')
    await flushPromises()
    expect(store.profile?.username).toBe('budi')
    expect(store.photos.items).toEqual([])
    expect(store.friends.items).toEqual([])
  })
})
