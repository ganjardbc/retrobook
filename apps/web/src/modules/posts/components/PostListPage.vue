<script setup lang="ts">
import type { Paged, Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { usePostList } from '@/modules/posts/composables/postList'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { postsApi } from '@/modules/posts/services/api'

// Halaman daftar post sederhana (Saved, On This Day): judul, daftar kartu, keadaan kosong.
const props = defineProps<{
  title: string
  empty: string
  icon: string
  fetchPage: (cursor: number | null) => Promise<Paged<Post>>
}>()
const list = usePostList((cursor) => props.fetchPage(cursor))
const sentinel = ref<HTMLElement | null>(null)
const likeFailed = ref(false)
let observer: IntersectionObserver | undefined

async function onDelete(id: number) {
  try {
    await postsApi.remove(id)
    list.remove(id)
  } catch {
    /* gagal: kartu tetap ada */
  }
}
async function onLike(id: number) {
  likeFailed.value = !(await list.toggleLike(id))
}

onMounted(() => {
  void list.loadMore()
  if (typeof IntersectionObserver === 'undefined' || !sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) void list.loadMore()
    },
    { rootMargin: '200px' },
  )
  observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())
watch(
  () => list.items.value.length,
  () =>
    observer &&
    sentinel.value &&
    (observer.unobserve(sentinel.value), observer.observe(sentinel.value)),
)
</script>

<template>
  <div class="post-list-page">
    <PageCard :title="title" />
    <p v-if="likeFailed" class="form-error" role="alert">{{ t('like.error') }}</p>
    <PostCard
      v-for="post in list.items.value"
      :key="post.id"
      :post="post"
      @delete="onDelete"
      @toggle-like="onLike"
      @comment-count="list.adjustComments"
      @shared="list.prepend"
      @updated="list.replace"
    />
    <LoadingRows v-if="list.loading.value" />
    <p v-else-if="list.failed.value" class="post-list-page__note" role="alert">
      {{ t('search.error') }}
      <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
    </p>
    <EmptyState
      v-else-if="list.done.value && list.items.value.length === 0"
      :icon="icon"
      :title="empty"
    />
    <div ref="sentinel" class="post-list-page__sentinel" />
  </div>
</template>

<style scoped>
.post-list-page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.post-list-page__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.post-list-page__sentinel {
  height: 1px;
}
</style>
