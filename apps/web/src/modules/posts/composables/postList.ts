import type { Paged, Post } from '@retrobook/shared'
import { ref } from 'vue'
import { postsApi } from '@/modules/posts/services/api'

/**
 * Daftar post berhalaman (kursor) beserta aksi pada kartunya. Dipakai feed dan timeline profil
 * supaya like optimistik, jumlah komentar, dan pencegahan muat ganda hanya ditulis sekali.
 */
export function usePostList(fetchPage: (cursor: string | null) => Promise<Paged<Post>>) {
  const items = ref<Post[]>([])
  const nextCursor = ref<string | null>(null)
  const done = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const liking = new Set<string>() // post yang sedang menunggu respons like
  // Penghitung generasi: respons yang datang setelah reset (akun/profil berganti) dibuang.
  let generation = 0

  function reset() {
    generation++
    items.value = []
    nextCursor.value = null
    done.value = false
    loading.value = false
    failed.value = false
    liking.clear()
  }

  /** Muat halaman berikutnya. Aman dipanggil berulang: panggilan saat memuat atau setelah habis diabaikan. */
  async function loadMore() {
    if (loading.value || done.value) return
    loading.value = true
    failed.value = false
    const gen = generation
    try {
      const page = await fetchPage(nextCursor.value)
      if (gen !== generation) return
      const known = new Set(items.value.map((p) => p.id))
      items.value.push(...page.items.filter((p) => !known.has(p.id)))
      nextCursor.value = page.nextCursor
      done.value = page.nextCursor === null
    } catch {
      if (gen === generation) failed.value = true
    } finally {
      if (gen === generation) loading.value = false
    }
  }

  /** Like/unlike optimistik: tampilan berubah dulu, lalu dikoreksi dengan angka dari server atau dikembalikan bila gagal. */
  async function toggleLike(id: string): Promise<boolean> {
    const post = items.value.find((p) => p.id === id)
    if (!post || liking.has(id)) return true
    liking.add(id)
    const before = { likeCount: post.likeCount, likedByMe: post.likedByMe }
    const willLike = !before.likedByMe
    post.likedByMe = willLike
    post.likeCount = Math.max(0, before.likeCount + (willLike ? 1 : -1))
    try {
      const state = await (willLike ? postsApi.like(id) : postsApi.unlike(id))
      post.likeCount = state.likeCount
      post.likedByMe = state.likedByMe
      return true
    } catch {
      post.likeCount = before.likeCount
      post.likedByMe = before.likedByMe
      return false
    } finally {
      liking.delete(id)
    }
  }

  /** Menyesuaikan jumlah komentar setelah komentar ditambah/dihapus dari daftar. */
  function adjustComments(id: string, delta: number) {
    const post = items.value.find((p) => p.id === id)
    if (post) post.commentCount = Math.max(0, post.commentCount + delta)
  }

  const prepend = (post: Post) => {
    if (!items.value.some((p) => p.id === post.id)) items.value.unshift(post)
  }
  const replace = (post: Post) => {
    const index = items.value.findIndex((item) => item.id === post.id)
    if (index !== -1) items.value[index] = post
  }
  const remove = (id: string) => {
    items.value = items.value.filter((p) => p.id !== id)
  }

  return {
    items,
    nextCursor,
    done,
    loading,
    failed,
    reset,
    loadMore,
    toggleLike,
    adjustComments,
    prepend,
    replace,
    remove,
  }
}
