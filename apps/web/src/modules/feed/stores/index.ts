import type { FeedSort } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsApi } from '@/modules/posts/services/api'
import { usePostList } from '@/modules/posts/composables/postList'

export const useFeedStore = defineStore('feed', () => {
  /** Urutan terpilih (POST-09); dibaca saat memuat, jadi ganti urutan = kosongkan lalu muat ulang. */
  const sort = ref<FeedSort>('recent')
  const list = usePostList((cursor) => postsApi.feed(cursor, undefined, sort.value))
  /** Pemilik data; feed dibersihkan bila akun berganti. */
  const ownerId = ref<number | null>(null)

  function reset(newOwnerId: number | null = null) {
    list.reset()
    sort.value = 'recent'
    ownerId.value = newOwnerId
  }

  async function setSort(next: FeedSort) {
    if (next === sort.value) return
    sort.value = next
    list.reset()
    await list.loadMore()
  }

  return { ...list, ownerId, sort, reset, setSort }
})
