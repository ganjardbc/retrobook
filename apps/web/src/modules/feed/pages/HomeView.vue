<script setup lang="ts">
import { FEED_SORTS, type FeedSort } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { postsApi } from '@/modules/posts/services/api'
import Button from '@/components/Button.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import AnnouncementBanner from '@/modules/feed/components/AnnouncementBanner.vue'
import StatusBox from '@/modules/feed/components/StatusBox.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useFeedStore } from '@/modules/feed/stores'

const auth = useAuthStore()
const feed = useFeedStore()
const sentinel = ref<HTMLElement | null>(null)
const statusBox = ref<InstanceType<typeof StatusBox> | null>(null)
let observer: IntersectionObserver | undefined

function focusStatusDraft() {
  statusBox.value?.focusDraft()
}

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
    <AnnouncementBanner />
    <StatusBox ref="statusBox" />
    <label class="home__sort">
      {{ t('feed.sort.label') }}
      <span class="home__sort-wrap">
        <select
          class="home__sort-select"
          :value="feed.sort"
          @change="feed.setSort(($event.target as HTMLSelectElement).value as FeedSort)"
        >
          <option v-for="s in FEED_SORTS" :key="s" :value="s">{{ t(`feed.sort.${s}`) }}</option>
        </select>
        <Icon icon="mdi:menu-down" class="home__sort-caret" aria-hidden="true" />
      </span>
    </label>
    <p v-if="likeFailed" class="form-error" role="alert">{{ t('like.error') }}</p>
    <PostCard
      v-for="post in feed.items"
      :key="post.id"
      :post="post"
      @delete="onDelete"
      @toggle-like="onLike"
      @comment-count="feed.adjustComments"
      @shared="feed.prepend"
      @updated="feed.replace"
    />

    <section
      v-if="!feed.loading && !feed.failed && feed.done && feed.items.length === 0"
      class="home__empty"
      :aria-label="t('feed.empty.title')"
    >
      <h2 class="home__empty-title">{{ t('feed.empty.title') }}</h2>
      <p class="home__empty-body">{{ t('feed.empty.body') }}</p>
      <div class="home__empty-actions">
        <Button @click="focusStatusDraft">{{ t('feed.empty.write') }}</Button>
        <Button variant="default" to="/friends">{{ t('feed.empty.friends') }}</Button>
      </div>
    </section>
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
.home__sort {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-1);
  margin: calc(-1 * var(--sp-1)) 0;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
  text-transform: uppercase;
}
/* Tautan kecil "Sort ▾" seperti ref-1, bukan kotak pilihan bawaan browser. */
.home__sort-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.home__sort-select {
  padding: 0 14px 0 0;
  color: var(--c-link);
  background: none;
  border: 0;
  appearance: none;
  font: inherit;
  text-transform: none;
  cursor: pointer;
}
.home__sort-caret {
  position: absolute;
  right: -2px;
  color: var(--c-link);
  pointer-events: none;
}
.home__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.home__empty {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
  text-align: center;
}
.home__empty-title {
  margin: 0;
  color: var(--c-text);
  font-size: var(--fs-title);
}
.home__empty-body {
  margin: var(--sp-2) 0 var(--sp-3);
  color: var(--c-text-muted);
}
.home__empty-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.home__more {
  text-align: center;
}
.home__sentinel {
  height: 1px;
}
</style>
