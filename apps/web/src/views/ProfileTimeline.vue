<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import Button from '../components/Button.vue'
import PostCard from '../components/PostCard.vue'
import StatusBox from '../components/StatusBox.vue'
import { postsApi } from '../api/posts'
import { useFeedStore } from '../stores/feed'
import { useProfileStore } from '../stores/profile'

const store = useProfileStore()
const feed = useFeedStore()
const list = store.timeline
const isSelf = computed(() => store.profile?.relationship === 'SELF')

async function onDelete(id: number) {
  try {
    await postsApi.remove(id)
    list.remove(id)
    feed.remove(id)
  } catch {
    /* gagal: kartu tetap ada */
  }
}
// Post tertulis di timeline sendiri juga masuk ke feed, dan sebaliknya.
const onPosted = (post: Parameters<typeof list.prepend>[0]) => list.prepend(post)
</script>

<template>
  <div class="timeline">
    <StatusBox v-if="isSelf" @posted="onPosted" />

    <PostCard
      v-for="post in list.items"
      :key="post.id"
      :post="post"
      @delete="onDelete"
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
</template>

<style scoped>
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
