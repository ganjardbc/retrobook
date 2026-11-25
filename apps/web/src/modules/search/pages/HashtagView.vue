<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { postsApi } from '@/modules/posts/services/api'
import { usePostList } from '@/modules/posts/composables/postList'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { searchApi } from '@/modules/search/services/api'

const route = useRoute()
const tag = computed(() => String(route.params.tag ?? '').toLowerCase())
const list = usePostList((cursor) => searchApi.hashtagPosts(tag.value, cursor))
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

watch(
  tag,
  () => {
    list.reset()
    void list.loadMore()
  },
  { immediate: true },
)
onMounted(() => {
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
// Konten pendek: sentinel masih terlihat setelah halaman terisi, jadi amati ulang sampai penuh atau habis.
watch(
  () => list.items.value.length,
  () =>
    observer &&
    sentinel.value &&
    (observer.unobserve(sentinel.value), observer.observe(sentinel.value)),
)
</script>

<template>
  <div class="hashtag-page">
    <PageCard :title="t('hashtag.title', { tag: `#${tag}` })" />
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
    <p v-else-if="list.failed.value" class="hashtag-page__note" role="alert">
      {{ t('search.error') }}
      <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
    </p>
    <EmptyState
      v-else-if="list.done.value && list.items.value.length === 0"
      icon="mdi:pound"
      :title="t('hashtag.empty')"
    />
    <div ref="sentinel" class="hashtag-page__sentinel" />
  </div>
</template>

<style scoped>
.hashtag-page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.hashtag-page__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.hashtag-page__sentinel {
  height: 1px;
}
</style>
