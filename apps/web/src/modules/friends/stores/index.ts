import type { FriendRequest, UserSummary } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { friendsApi } from '@/modules/friends/services/api'

export const useFriendsStore = defineStore('friends', () => {
  // Permintaan masuk
  const requests = ref<FriendRequest[]>([])
  const requestsCursor = ref<number | null>(null)
  const requestsDone = ref(false)
  const requestsLoading = ref(false)
  const requestsFailed = ref(false)

  // Daftar teman
  const friends = ref<UserSummary[]>([])
  const friendsCursor = ref<number | null>(null)
  const friendsDone = ref(false)
  const friendsLoading = ref(false)
  const friendsFailed = ref(false)
  const total = ref(0)
  const query = ref('')

  const ownerId = ref<number | null>(null)
  // Penghitung generasi: respons yang datang setelah reset atau pencarian baru dibuang.
  let generation = 0

  function reset(newOwnerId: number | null = null) {
    generation++
    requests.value = []
    requestsCursor.value = null
    requestsDone.value = false
    requestsLoading.value = false
    requestsFailed.value = false
    friends.value = []
    friendsCursor.value = null
    friendsDone.value = false
    friendsLoading.value = false
    friendsFailed.value = false
    total.value = 0
    query.value = ''
    ownerId.value = newOwnerId
  }

  async function loadRequests() {
    if (requestsLoading.value || requestsDone.value) return
    requestsLoading.value = true
    requestsFailed.value = false
    const gen = generation
    try {
      const page = await friendsApi.requests(requestsCursor.value)
      if (gen !== generation) return
      const known = new Set(requests.value.map((r) => r.user.id))
      requests.value.push(...page.items.filter((r) => !known.has(r.user.id)))
      requestsCursor.value = page.nextCursor
      requestsDone.value = page.nextCursor === null
    } catch {
      if (gen === generation) requestsFailed.value = true
    } finally {
      if (gen === generation) requestsLoading.value = false
    }
  }

  async function loadFriends() {
    if (friendsLoading.value || friendsDone.value) return
    friendsLoading.value = true
    friendsFailed.value = false
    const gen = generation
    try {
      const page = await friendsApi.list(friendsCursor.value, query.value)
      if (gen !== generation) return
      const known = new Set(friends.value.map((u) => u.id))
      friends.value.push(...page.items.filter((u) => !known.has(u.id)))
      friendsCursor.value = page.nextCursor
      friendsDone.value = page.nextCursor === null
      total.value = page.total
    } catch {
      if (gen === generation) friendsFailed.value = true
    } finally {
      if (gen === generation) friendsLoading.value = false
    }
  }

  /** Pencarian baru: kosongkan daftar teman lalu muat dari awal; hasil pencarian lama dibuang. */
  async function search(q: string) {
    generation++
    query.value = q.trim()
    friends.value = []
    friendsCursor.value = null
    friendsDone.value = false
    friendsLoading.value = false
    await loadFriends()
  }

  /** Terima: permintaan pindah ke daftar teman (di paling atas) tanpa muat ulang. */
  async function accept(userId: number): Promise<boolean> {
    const req = requests.value.find((r) => r.user.id === userId)
    if (!req) return false
    try {
      await friendsApi.accept(userId)
    } catch {
      return false
    }
    requests.value = requests.value.filter((r) => r.user.id !== userId)
    if (!query.value || matches(req.user, query.value)) friends.value.unshift(req.user)
    total.value += 1
    return true
  }

  async function reject(userId: number): Promise<boolean> {
    try {
      await friendsApi.reject(userId)
    } catch {
      return false
    }
    requests.value = requests.value.filter((r) => r.user.id !== userId)
    return true
  }

  async function unfriend(userId: number): Promise<boolean> {
    try {
      await friendsApi.unfriend(userId)
    } catch {
      return false
    }
    if (friends.value.some((u) => u.id === userId)) total.value = Math.max(0, total.value - 1)
    friends.value = friends.value.filter((u) => u.id !== userId)
    return true
  }

  return {
    requests,
    requestsDone,
    requestsLoading,
    requestsFailed,
    friends,
    friendsDone,
    friendsLoading,
    friendsFailed,
    total,
    query,
    ownerId,
    reset,
    loadRequests,
    loadFriends,
    search,
    accept,
    reject,
    unfriend,
  }
})

const matches = (u: UserSummary, q: string) =>
  `${u.displayName} ${u.username}`.toLowerCase().includes(q.toLowerCase())
