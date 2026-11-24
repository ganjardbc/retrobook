import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsApi } from '@/modules/posts/services/api'
import { usePostList } from '@/modules/posts/composables/postList'

export const useFeedStore = defineStore('feed', () => {
  const list = usePostList((cursor) => postsApi.feed(cursor))
  /** Pemilik data; feed dibersihkan bila akun berganti. */
  const ownerId = ref<number | null>(null)

  function reset(newOwnerId: number | null = null) {
    list.reset()
    ownerId.value = newOwnerId
  }

  return { ...list, ownerId, reset }
})
