import type { Profile } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiRequestError } from '../api/http'
import { meApi } from '../api/me'
import { usersApi } from '../api/users'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import EditProfileView from './EditProfileView.vue'

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 1,
  username: 'me',
  displayName: 'Me Lama',
  avatarUrl: null,
  isBot: false,
  coverUrl: null,
  bio: 'Bio lama',
  birthday: '1995-08-30',
  hometown: 'Solo',
  currentCity: null,
  workplace: 'Kantor',
  school: null,
  friendCount: 0,
  relationship: 'SELF',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

async function mountForm() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })
  await router.push('/me/edit')
  const w = mount(EditProfileView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}
const field = (w: ReturnType<typeof mount>, name: string) => w.find(`[name="${name}"]`)

describe('EditProfileView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 1, username: 'me', displayName: 'Me Lama' }
    vi.restoreAllMocks()
    vi.spyOn(usersApi, 'profile').mockResolvedValue(profile())
  })

  it('memuat nilai saat ini ke dalam form', async () => {
    const { w } = await mountForm()
    expect((field(w, 'displayName').element as HTMLInputElement).value).toBe('Me Lama')
    expect((field(w, 'bio').element as HTMLTextAreaElement).value).toBe('Bio lama')
    expect((field(w, 'hometown').element as HTMLInputElement).value).toBe('Solo')
    expect((field(w, 'currentCity').element as HTMLInputElement).value).toBe('') // null -> kosong
    expect((field(w, 'birthday').element as HTMLInputElement).value).toBe('1995-08-30')
  })

  it('simpan: kolom kosong dikirim null, sesi dan profil diperbarui, pindah ke profil', async () => {
    const update = vi.spyOn(meApi, 'update').mockResolvedValue(profile({ displayName: 'Me Baru' }))
    const resetSpy = vi.spyOn(useProfileStore(), 'reset')
    const { w, router } = await mountForm()
    await field(w, 'displayName').setValue('Me Baru')
    await field(w, 'bio').setValue('   ')
    await field(w, 'hometown').setValue('')
    await field(w, 'currentCity').setValue('Bandung')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(update).toHaveBeenCalledWith({
      displayName: 'Me Baru',
      bio: null,
      hometown: null,
      currentCity: 'Bandung',
      workplace: 'Kantor',
      school: null,
      birthday: '1995-08-30',
    })
    expect(useAuthStore().user?.displayName).toBe('Me Baru')
    expect(resetSpy).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/me')
  })

  it('galat validasi dari server ditampilkan dan form tetap terisi, tanpa pindah halaman', async () => {
    vi.spyOn(meApi, 'update').mockRejectedValue(
      new ApiRequestError(400, 'VALIDATION_FAILED', ['Tanggal lahir tidak valid']),
    )
    const { w, router } = await mountForm()
    await field(w, 'bio').setValue('tetap ada')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('Tanggal lahir tidak valid')
    expect((field(w, 'bio').element as HTMLTextAreaElement).value).toBe('tetap ada')
    expect(router.currentRoute.value.path).toBe('/me/edit')
    expect(useAuthStore().user?.displayName).toBe('Me Lama')
  })

  it('tombol Save nonaktif saat menyimpan (cegah kirim ganda)', async () => {
    let release!: (p: Profile) => void
    const update = vi.spyOn(meApi, 'update').mockReturnValue(new Promise((r) => (release = r)))
    const { w } = await mountForm()
    await w.find('form').trigger('submit')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await w.find('form').trigger('submit')
    release(profile())
    await flushPromises()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('field memakai batas panjang yang sama dengan server', async () => {
    const { w } = await mountForm()
    expect(field(w, 'displayName').attributes('maxlength')).toBe('80')
    expect(field(w, 'bio').attributes('maxlength')).toBe('2000')
    expect(field(w, 'workplace').attributes('maxlength')).toBe('120')
  })
})
