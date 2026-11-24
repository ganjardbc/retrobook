import type { Post } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsApi } from '../api/posts'

export const useFeedStore = defineStore('feed', () => {
  const items = ref<Post[]>([])
  const nextCursor = ref<number | null>(null)
  const done = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  /** Pemilik data; feed dibersihkan bila akun berganti. */
  const ownerId = ref<number | null>(null)
  const liking = new Set<number>() // post yang sedang menunggu respons like

  function reset(newOwnerId: number | null = null) {
    items.value = []
    nextCursor.value = null
    done.value = false
    loading.value = false
    failed.value = false
    ownerId.value = newOwnerId
    liking.clear()
  }

  /** Muat halaman berikutnya. Aman dipanggil berulang: panggilan saat memuat atau setelah habis diabaikan. */
  async function loadMore() {
    if (loading.value || done.value) return
    loading.value = true
    failed.value = false
    const owner = ownerId.value
    try {
      const page = await postsApi.feed(nextCursor.value)
      if (owner !== ownerId.value) return // akun berganti saat menunggu
      const known = new Set(items.value.map((p) => p.id))
      items.value.push(...page.items.filter((p) => !known.has(p.id)))
      nextCursor.value = page.nextCursor
      done.value = page.nextCursor === null
    } catch {
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  /** Like/unlike optimistik: tampilan berubah dulu, lalu dikoreksi dengan angka dari server atau dikembalikan bila gagal. */
  async function toggleLike(id: number): Promise<boolean> {
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
  function adjustComments(id: number, delta: number) {
    const post = items.value.find((p) => p.id === id)
    if (post) post.commentCount = Math.max(0, post.commentCount + delta)
  }

  const prepend = (post: Post) => items.value.unshift(post)
  const remove = (id: number) => {
    items.value = items.value.filter((p) => p.id !== id)
  }

  return {
    items,
    nextCursor,
    done,
    loading,
    failed,
    ownerId,
    reset,
    loadMore,
    toggleLike,
    adjustComments,
    prepend,
    remove,
  }
})
