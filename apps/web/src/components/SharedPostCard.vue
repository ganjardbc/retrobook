<script setup lang="ts">
import type { Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatTime } from '../utils/time'
import Avatar from './Avatar.vue'

const props = defineProps<{ original: NonNullable<Post['sharedFrom']> }>()

// `{ unavailable: true }` bila dihapus atau tidak boleh dilihat pembaca ini; sebabnya tidak dibedakan.
const post = computed(() => ('unavailable' in props.original ? null : props.original))
</script>

<template>
  <div class="shared">
    <p v-if="!post" class="shared__gone">{{ t('share.unavailable') }}</p>
    <template v-else>
      <div class="shared__head">
        <Avatar :name="post.author.displayName" :src="post.author.avatarUrl" size="s" />
        <div>
          <RouterLink class="shared__name" :to="`/${post.author.username}`">{{
            post.author.displayName
          }}</RouterLink>
          <div class="shared__time">{{ formatTime(post.createdAt) }}</div>
        </div>
      </div>
      <!-- Isi asal selalu teks, tidak pernah HTML. -->
      <p v-if="post.content" class="shared__text">{{ post.content }}</p>
      <img
        v-if="post.imageUrl"
        class="shared__image"
        :src="post.imageUrl"
        :alt="t('post.image.alt', { name: post.author.displayName })"
        loading="lazy"
      />
    </template>
  </div>
</template>

<style scoped>
.shared {
  margin: 0 var(--sp-3) var(--sp-3);
  border: var(--card-border);
  background: var(--c-card);
}
.shared__gone {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.shared__head {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) 0;
}
.shared__name {
  font-weight: bold;
}
.shared__time {
  color: var(--c-text-muted);
}
.shared__text {
  margin: 0;
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.shared__image {
  display: block;
  width: 100%;
  height: auto;
}
</style>
