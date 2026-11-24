import type { Post, Profile } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { friendsApi } from '@/modules/friends/services/api'
import { ApiRequestError } from '@/plugins/http'
import { usersApi } from '@/modules/profile/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import ProfileAbout from '@/modules/profile/pages/ProfileAbout.vue'
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
  friendCount: 12,
  relationship: 'NONE',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})
const mkPost = (id: number, content: string): Post =>
  ({
    id,
    author: { id: 7, username: 'siti', displayName: 'Siti Aminah', avatarUrl: null, isBot: false },
    wallOwner: null,
    sharedFrom: null,
    content,
    imageUrl: null,
    feeling: null,
    privacy: 'PUBLIC',
    tags: [],
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    likedPreview: [],
    editedAt: null,
    createdAt: new Date().toISOString(),
  }) as Post

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
        ],
      },
    ],
  })
  await router.push(path)
  const w = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}

describe('ProfileView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.restoreAllMocks()
    vi.spyOn(usersApi, 'timeline').mockResolvedValue({
      items: [mkPost(1, 'halo dunia')],
      nextCursor: null,
    })
  })

  it('scroller tahun: tampil bila ada lebih dari satu tahun; klik tahun memuat post tahun itu', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    vi.spyOn(usersApi, 'years').mockResolvedValue({ items: [2015, 2014] })
    const { w } = await mountAt('/siti')
    const years = w.find('nav.years')
    expect(years.exists()).toBe(true)
    vi.mocked(usersApi.timeline).mockResolvedValue({
      items: [mkPost(7, 'dari 2014')],
      nextCursor: null,
    })
    await years.findAll('button')[2]!.trigger('click')
    await flushPromises()
    expect(usersApi.timeline).toHaveBeenLastCalledWith('siti', null, undefined, 2014)
    expect(w.text()).toContain('dari 2014')
    expect(w.text()).not.toContain('halo dunia')
  })

  it('scroller tahun: tersembunyi bila hanya satu tahun atau tidak ada', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    vi.spyOn(usersApi, 'years').mockResolvedValue({ items: [2015] })
    const { w } = await mountAt('/siti')
    expect(w.find('nav.years').exists()).toBe(false)
  })

  it('menampilkan nama, jumlah teman di tab, info yang terisi, dan timeline', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(
      profile({
        school: 'UWE',
        currentCity: 'Bristol',
        hometown: 'London',
        birthday: '1995-08-30',
      }),
    )
    const { w } = await mountAt('/siti')
    expect(w.find('h1').text()).toBe('Siti Aminah')
    expect(w.find('.tabs').text()).toContain('12')
    expect(w.text()).toContain('Studied at UWE')
    expect(w.text()).toContain('Lives in Bristol')
    expect(w.text()).toContain('From London')
    expect(w.text()).toContain('Born on August 30, 1995')
    expect(w.text()).not.toContain('Works at') // baris kosong tidak ditampilkan
    expect(w.text()).toContain('halo dunia')
  })

  it('profil orang lain tidak menampilkan StatusBox; profil sendiri menampilkannya', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValueOnce(profile())
    const other = await mountAt('/siti')
    expect(other.w.find('.status').exists()).toBe(false)

    setActivePinia(createPinia())
    useAuthStore().user = { id: 7, username: 'siti', displayName: 'Siti Aminah' }
    vi.spyOn(usersApi, 'profile').mockResolvedValueOnce(profile({ relationship: 'SELF' }))
    const own = await mountAt('/siti')
    expect(own.w.find('.status').exists()).toBe(true)
    // profil sendiri: Update Info dan kontrol foto, tanpa tombol pertemanan
    expect(own.w.find('.header__actions a').attributes('href')).toBe('/me/edit')
    expect(own.w.find('.header__actions').text()).toBe('Update Info')
    expect(own.w.find('.header__photo--avatar').exists()).toBe(true)
    expect(own.w.find('.header__photo--cover').exists()).toBe(true)
    expect(other.w.find('.header__photo').exists()).toBe(false) // orang lain: tanpa kontrol foto
  })

  it('profil teman: StatusBox dinding tanpa pilihan privasi; bukan teman: tanpa kotak', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValueOnce(profile({ relationship: 'FRIENDS' }))
    const friend = await mountAt('/siti')
    expect(friend.w.find('.status').exists()).toBe(true)
    expect(friend.w.find('textarea').attributes('placeholder')).toBe(
      'Write something to Siti Aminah...',
    )
    expect(friend.w.find('.status__privacy').exists()).toBe(false)

    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.spyOn(usersApi, 'profile').mockResolvedValueOnce(profile({ relationship: 'REQUEST_SENT' }))
    expect((await mountAt('/siti')).w.find('.status').exists()).toBe(false)
  })

  it('404: pesan "tidak tersedia" tanpa membedakan sebab, tidak ada header', async () => {
    vi.spyOn(usersApi, 'profile').mockRejectedValue(new ApiRequestError(404, 'NOT_FOUND', ['x']))
    const { w } = await mountAt('/hantu')
    expect(w.text()).toContain("This content isn't available right now.")
    expect(w.find('.header').exists()).toBe(false)
  })

  it('galat jaringan: pesan dan tombol Try again yang memuat ulang', async () => {
    const prof = vi
      .spyOn(usersApi, 'profile')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(profile())
    const { w } = await mountAt('/siti')
    expect(w.text()).toContain('Could not load this profile.')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Try again')!
      .trigger('click')
    await flushPromises()
    expect(prof).toHaveBeenCalledTimes(2)
    expect(w.find('h1').text()).toBe('Siti Aminah')
  })

  it.each([
    ['NONE', ['Add Friend', 'Report']],
    ['REQUEST_SENT', ['Cancel Request', 'Report']],
    ['REQUEST_RECEIVED', ['Confirm', 'Delete Request', 'Report']],
    ['FRIENDS', ['✓ Friends', 'Message', 'Poke', 'Report']],
  ] as const)('relationship %s menampilkan tombol yang sesuai', async (rel, labels) => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile({ relationship: rel }))
    const { w } = await mountAt('/siti')
    expect(w.findAll('.header__actions button').map((b) => b.text())).toEqual(labels)
  })

  it('Report di profil orang lain membuka dialog untuk user itu; profil sendiri tanpa Report', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile({ relationship: 'NONE' }))
    const { w } = await mountAt('/siti')
    const report = w.findAll('.header__actions button').find((b) => b.text() === 'Report')!
    await report.trigger('click')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.querySelector('h2')?.textContent).toBe('Report this profile')
    w.unmount()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    setActivePinia(createPinia()) // store profil menyimpan username yang sama
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me' }
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile({ relationship: 'SELF' }))
    const own = await mountAt('/siti')
    expect(own.w.findAll('.header__actions button').map((b) => b.text())).not.toContain('Report')
  })

  it('Add Friend: memanggil API dan tombol berubah menjadi Cancel Request', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    const send = vi.spyOn(friendsApi, 'send').mockResolvedValue({ userId: 7, status: 'PENDING' })
    const { w } = await mountAt('/siti')
    await w.find('.header__actions button').trigger('click')
    await flushPromises()
    expect(send).toHaveBeenCalledWith(7)
    expect(w.find('.header__actions button').text()).toBe('Cancel Request')
  })

  it('Confirm menaikkan jumlah teman di tab; Unfriend meminta konfirmasi', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile({ relationship: 'REQUEST_RECEIVED' }))
    vi.spyOn(friendsApi, 'accept').mockResolvedValue({ userId: 7, status: 'ACCEPTED' })
    const unfriend = vi.spyOn(friendsApi, 'unfriend').mockResolvedValue(undefined)
    const { w } = await mountAt('/siti')
    await w
      .findAll('.header__actions button')
      .find((b) => b.text() === 'Confirm')!
      .trigger('click')
    await flushPromises()
    expect(w.find('.tabs').text()).toContain('13')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await w.find('.header__actions button').trigger('click')
    expect(unfriend).not.toHaveBeenCalled()
    confirm.mockReturnValueOnce(true)
    await w.find('.header__actions button').trigger('click')
    await flushPromises()
    expect(unfriend).toHaveBeenCalledWith(7)
    expect(w.find('.header__actions button').text()).toBe('Add Friend')
  })

  it('tab About menampilkan bio sebagai teks (bukan HTML) tanpa memuat ulang profil', async () => {
    const prof = vi
      .spyOn(usersApi, 'profile')
      .mockResolvedValue(
        profile({ bio: '<img src=x onerror="window.__bio=1">Suka ski', workplace: 'Toko Buku' }),
      )
    const { w, router } = await mountAt('/siti')
    await router.push('/siti/about')
    await flushPromises()
    expect(w.find('.about__bio').text()).toContain('<img src=x onerror="window.__bio=1">Suka ski')
    expect(w.find('.about__bio img').exists()).toBe(false)
    expect(w.find('.about').text()).toContain('Works at Toko Buku')
    expect(prof).toHaveBeenCalledTimes(1)
    expect(w.find('.tabs__tab--active').text()).toBe('About')
  })

  it('About kosong menampilkan pesan; tanpa info, kartu info samping tidak muncul', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    const { w, router } = await mountAt('/siti/about')
    expect(w.text()).toContain('No information to show.')
    expect(w.find('.info').exists()).toBe(false)
    await router.push('/siti')
  })

  it('timeline kosong menampilkan pesan', async () => {
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
    vi.spyOn(usersApi, 'timeline').mockResolvedValue({ items: [], nextCursor: null })
    const { w } = await mountAt('/siti')
    expect(w.text()).toContain('No posts to show.')
  })
})
