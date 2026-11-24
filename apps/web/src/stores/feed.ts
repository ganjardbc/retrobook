import { defineStore } from 'pinia'
import { ref } from 'vue'
import { postsApi } from '../api/posts'
import { usePostList } from '../composables/postList'

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
