import type { Profile, ProfilePhoto, Relationship, UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiRequestError } from '@/plugins/http'
import { friendsApi } from '@/modules/friends/services/api'
import { usersApi } from '@/modules/profile/services/api'
import { usePaged } from '@/composables/paged'
import { usePostList } from '@/modules/posts/composables/postList'
import { meApi } from '@/modules/profile/services/me'
import { imageProblem } from '@/helpers/image'
import { useAuthStore } from '@/modules/auth/stores'

export type ProfileState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

/** Satu profil aktif pada satu waktu: data profil, hubungan, dan timeline-nya. */
export const useProfileStore = defineStore('profile', () => {
  const username = ref('')
  const profile = ref<Profile | null>(null)
  const state = ref<ProfileState>('idle')
  const actionFailed = ref(false)
  const timeline = usePostList((cursor) => usersApi.timeline(username.value, cursor))
  const friends = usePaged<UserSummary>(
    (cursor) => usersApi.friends(username.value, cursor),
    (u) => u.id,
  )
  const photos = usePaged<ProfilePhoto>(
    (cursor) => usersApi.photos(username.value, cursor),
    (p) => p.postId,
  )
  let generation = 0

  async function load(name: string) {
    // Membuka profil yang sama lagi tidak memuat ulang (pindah tab Timeline/About).
    if (
      username.value.toLowerCase() === name.toLowerCase() &&
      (state.value === 'ready' || state.value === 'loading')
    )
      return
    const gen = ++generation
    username.value = name
    profile.value = null
    state.value = 'loading'
    actionFailed.value = false
    timeline.reset()
    friends.reset()
    photos.reset()
    try {
      const p = await usersApi.profile(name)
      if (gen !== generation) return
      profile.value = p
      state.value = 'ready'
      void timeline.loadMore()
      void friends.loadMore() // grid enam teman di kartu info dan tab Friends memakai daftar yang sama
    } catch (e) {
      if (gen !== generation) return
      // 404 sama untuk "tidak ada", privasi, BANNED, dan blokir: tidak membedakan sebabnya.
      state.value = e instanceof ApiRequestError && e.status === 404 ? 'unavailable' : 'error'
    }
  }

  function reset() {
    generation++
    username.value = ''
    profile.value = null
    state.value = 'idle'
    timeline.reset()
    friends.reset()
    photos.reset()
  }

  /** Mengubah hubungan lewat API pertemanan lalu memperbarui profil di tempat (tanpa muat ulang). */
  async function relate(
    action: 'send' | 'cancel' | 'accept' | 'reject' | 'unfriend',
  ): Promise<boolean> {
    const p = profile.value
    if (!p) return false
    actionFailed.value = false
    const next: Record<typeof action, Relationship> = {
      send: 'REQUEST_SENT',
      cancel: 'NONE',
      accept: 'FRIENDS',
      reject: 'NONE',
      unfriend: 'NONE',
    }
    try {
      if (action === 'send') {
        const r = await friendsApi.send(p.id)
        p.relationship = r.status === 'ACCEPTED' ? 'FRIENDS' : 'REQUEST_SENT' // permintaan silang
      } else {
        if (action === 'accept') await friendsApi.accept(p.id)
        else if (action === 'unfriend') await friendsApi.unfriend(p.id)
        else await friendsApi.reject(p.id)
        p.relationship = next[action]
      }
      if (p.relationship === 'FRIENDS' && action !== 'unfriend') p.friendCount += 1
      if (action === 'unfriend') p.friendCount = Math.max(0, p.friendCount - 1)
      return true
    } catch {
      actionFailed.value = true
      return false
    }
  }

  /**
   * Ganti foto profil atau cover sendiri. Mengembalikan kunci pesan galat (validasi klien) atau
   * teks galat server; null bila berhasil. Sesi (navbar) ikut diperbarui untuk foto profil.
   */
  async function uploadPhoto(kind: 'avatar' | 'cover', file: File): Promise<string | null> {
    const problem = imageProblem(file)
    if (problem) return t(problem)
    try {
      const updated = await (kind === 'avatar' ? meApi.uploadAvatar(file) : meApi.uploadCover(file))
      if (profile.value && profile.value.id === updated.id) {
        profile.value.avatarUrl = updated.avatarUrl
        profile.value.coverUrl = updated.coverUrl
      }
      if (kind === 'avatar') useAuthStore().patchUser({ avatarUrl: updated.avatarUrl })
      return null
    } catch (e) {
      return e instanceof ApiRequestError ? e.messages.join(' ') : t('error.network')
    }
  }

  return {
    username,
    profile,
    state,
    actionFailed,
    timeline,
    friends,
    photos,
    load,
    reset,
    relate,
    uploadPhoto,
  }
})
