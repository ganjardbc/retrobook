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

  function reset(newOwnerId: number | null = null) {
    items.value = []
    nextCursor.value = null
    done.value = false
    loading.value = false
    failed.value = false
    ownerId.value = newOwnerId
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

  const prepend = (post: Post) => items.value.unshift(post)
  const remove = (id: number) => {
    items.value = items.value.filter((p) => p.id !== id)
  }

  return { items, nextCursor, done, loading, failed, ownerId, reset, loadMore, prepend, remove }
})
