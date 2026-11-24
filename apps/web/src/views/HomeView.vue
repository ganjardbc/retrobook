<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { postsApi } from '../api/posts'
import Button from '../components/Button.vue'
import PostCard from '../components/PostCard.vue'
import StatusBox from '../components/StatusBox.vue'
import { useAuthStore } from '../stores/auth'
import { useFeedStore } from '../stores/feed'

const auth = useAuthStore()
const feed = useFeedStore()
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

async function onDelete(id: number) {
  try {
    await postsApi.remove(id)
    feed.remove(id)
  } catch {
    /* gagal: kartu tetap ada; pesan kesalahan bergaya Toast menyusul */
  }
}

const likeFailed = ref(false)
async function onLike(id: number) {
  likeFailed.value = !(await feed.toggleLike(id))
}

onMounted(() => {
  // Feed milik akun sebelumnya tidak boleh terlihat setelah ganti akun.
  if (feed.ownerId !== (auth.user?.id ?? null)) feed.reset(auth.user?.id ?? null)
  void feed.loadMore()
  // Infinite scroll (POST-04); tombol "Load more" tetap ada untuk keyboard dan browser tanpa IntersectionObserver.
  if (typeof IntersectionObserver !== 'undefined' && sentinel.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void feed.loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
// Setelah halaman terisi, sentinel masih terlihat bila konten pendek: muat lagi sampai layar penuh atau habis.
watch(
  () => feed.items.length,
  () =>
    observer &&
    sentinel.value &&
    (observer.unobserve(sentinel.value), observer.observe(sentinel.value)),
)
</script>

<template>
  <div class="home">
    <StatusBox />
    <p v-if="likeFailed" class="form-error" role="alert">{{ t('like.error') }}</p>
    <PostCard
      v-for="post in feed.items"
      :key="post.id"
      :post="post"
      @delete="onDelete"
      @toggle-like="onLike"
      @comment-count="feed.adjustComments"
      @shared="feed.prepend"
    />

    <p
      v-if="!feed.loading && !feed.failed && feed.done && feed.items.length === 0"
      class="home__note"
    >
      {{ t('feed.empty') }}
    </p>
    <p v-else-if="feed.done && feed.items.length" class="home__note">{{ t('feed.end') }}</p>
    <p v-if="feed.loading" class="home__note" role="status">{{ t('common.loading') }}</p>
    <div v-if="feed.failed" class="home__note" role="alert">
      {{ t('feed.error') }}
      <Button variant="default" @click="feed.loadMore()">{{ t('feed.retry') }}</Button>
    </div>
    <div v-if="!feed.done && !feed.loading && !feed.failed" class="home__more">
      <Button variant="default" @click="feed.loadMore()">{{ t('feed.loadMore') }}</Button>
    </div>
    <div ref="sentinel" class="home__sentinel" />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.home__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.home__more {
  text-align: center;
}
.home__sentinel {
  height: 1px;
}
</style>
