<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import Button from '@/components/Button.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import YearScroller from '@/modules/profile/components/YearScroller.vue'
import StatusBox from '@/modules/feed/components/StatusBox.vue'
import { postsApi } from '@/modules/posts/services/api'
import { useFeedStore } from '@/modules/feed/stores'
import { useProfileStore } from '@/modules/profile/stores'

const store = useProfileStore()
const feed = useFeedStore()
const list = store.timeline
const isSelf = computed(() => store.profile?.relationship === 'SELF')
const isFriend = computed(() => store.profile?.relationship === 'FRIENDS')

async function onDelete(id: number) {
  try {
    await postsApi.remove(id)
    list.remove(id)
    feed.remove(id)
  } catch {
    /* gagal: kartu tetap ada */
  }
}
// Post baru tidak cocok dengan tahun yang sedang disaring: kembali ke semua (dimuat ulang, post baru di atas).
function show(post: Parameters<typeof list.prepend>[0]) {
  if (store.year === null) list.prepend(post)
  else void store.setYear(null)
}

// Share yang dibuat dari timeline: masuk feed, dan masuk timeline ini bila ini profil sendiri.
function onShared(post: Parameters<typeof list.prepend>[0]) {
  feed.prepend(post)
  if (isSelf.value) show(post)
}

// Post tertulis di timeline sendiri juga masuk ke feed, dan sebaliknya.
const onPosted = show
// Wall post di dinding teman: tampil di timeline ini dan di feed sendiri.
function onWallPosted(post: Parameters<typeof list.prepend>[0]) {
  show(post)
  feed.prepend(post)
}
</script>

<template>
  <div class="timeline-wrap">
    <div class="timeline">
      <StatusBox v-if="isSelf" @posted="onPosted" />
      <!-- WAL-01: teman menulis di dinding; hasilnya tampil "Nama ▸ Nama". -->
      <StatusBox
        v-else-if="isFriend && store.profile"
        :wall-owner="store.profile"
        @posted="onWallPosted"
      />

      <PostCard
        v-for="post in list.items"
        :key="post.id"
        :post="post"
        @delete="onDelete"
        @shared="onShared"
        @updated="list.replace"
        @toggle-like="list.toggleLike"
        @comment-count="list.adjustComments"
      />

      <p v-if="list.loading" class="timeline__note" role="status">{{ t('common.loading') }}</p>
      <div v-else-if="list.failed" class="timeline__note" role="alert">
        {{ t('feed.error') }}
        <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
      </div>
      <p v-else-if="list.done && list.items.length === 0" class="timeline__note">
        {{ t('profile.noPosts') }}
      </p>
      <div v-else-if="!list.done" class="timeline__more">
        <Button variant="default" @click="list.loadMore()">{{ t('feed.loadMore') }}</Button>
      </div>
    </div>
    <YearScroller
      v-if="store.years.length > 1"
      :years="store.years"
      :selected="store.year"
      @select="store.setYear"
    />
  </div>
</template>

<style scoped>
.timeline-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--sp-3);
}
@media (max-width: 900px) {
  .timeline-wrap {
    grid-template-columns: minmax(0, 1fr);
  }
  /* Layar sempit: tahun di atas timeline. */
  .timeline-wrap > :last-child {
    order: -1;
  }
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.timeline__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.timeline__more {
  text-align: center;
}
</style>
