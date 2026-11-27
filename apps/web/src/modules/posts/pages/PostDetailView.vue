<script setup lang="ts">
import type { Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { usePostList } from '@/modules/posts/composables/postList'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const missing = ref(false)
const loadFailed = ref(false) // gagal karena jaringan/server, bukan 404
const deleteFailed = ref(false)
const likeFailed = ref(false)
// Post utama dan daftar related memakai composable yang sama supaya like/komentar/edit konsisten.
const main = usePostList(async () => {
  try {
    return { items: [await postsApi.get(String(route.params.id))], nextCursor: null }
  } catch (e) {
    // 404 (juga untuk privasi/blokir) = tidak tersedia; selain itu bisa dicoba lagi.
    loadFailed.value = !(e instanceof ApiRequestError && e.status === 404)
    throw e
  }
})
const related = usePostList(async () => ({
  items: await postsApi.related(String(route.params.id)),
  nextCursor: null,
}))

async function load() {
  loading.value = true
  missing.value = false
  loadFailed.value = false
  main.reset()
  related.reset()
  await main.loadMore()
  if (main.failed.value) missing.value = true
  else void related.loadMore()
  loading.value = false
}
// Pindah ke post lain lewat daftar related: muat ulang di halaman yang sama.
watch(() => route.params.id, load, { immediate: true })

async function onDelete(id: string) {
  try {
    deleteFailed.value = false
    await postsApi.remove(id)
    if (id === String(route.params.id)) void router.replace('/')
    else related.remove(id)
  } catch {
    deleteFailed.value = true // kartu tetap ada
  }
}
const onLike = async (list: typeof main, id: string) => {
  likeFailed.value = !(await list.toggleLike(id))
}
const onUpdated = (list: typeof main, post: Post) => list.replace(post)
</script>

<template>
  <div class="post-detail">
    <LoadingRows v-if="loading" />
    <EmptyState
      v-else-if="missing && loadFailed"
      icon="mdi:cloud-off-outline"
      :title="t('error.network')"
    >
      <Button variant="default" @click="load">{{ t('feed.retry') }}</Button>
    </EmptyState>
    <EmptyState
      v-else-if="missing"
      icon="mdi:comment-off-outline"
      :title="t('postDetail.notFound')"
    />
    <template v-else>
      <p v-if="deleteFailed" class="form-error" role="alert">{{ t('postDetail.deleteError') }}</p>
      <p v-if="likeFailed" class="form-error" role="alert">{{ t('like.error') }}</p>
      <PostCard
        v-for="post in main.items.value"
        :key="post.id"
        :post="post"
        detail
        @delete="onDelete"
        @toggle-like="(id) => onLike(main, id)"
        @comment-count="main.adjustComments"
        @shared="related.prepend"
        @updated="(p) => onUpdated(main, p)"
      />
      <template v-if="related.items.value.length">
        <PageCard :title="t('postDetail.related')" heading="h2" />
        <PostCard
          v-for="post in related.items.value"
          :key="post.id"
          :post="post"
          @delete="onDelete"
          @toggle-like="(id) => onLike(related, id)"
          @comment-count="related.adjustComments"
          @updated="(p) => onUpdated(related, p)"
        />
      </template>
      <p class="post-detail__note">{{ t('feed.end') }}</p>
    </template>
  </div>
</template>

<style scoped>
.post-detail {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.post-detail__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
</style>
