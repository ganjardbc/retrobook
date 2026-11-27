<script setup lang="ts">
import type { Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { formatTime } from '@/helpers/time'
import Avatar from '@/components/Avatar.vue'
import HashtagText from '@/modules/posts/components/HashtagText.vue'

const props = defineProps<{ original: NonNullable<Post['sharedFrom']> }>()

// `{ unavailable: true }` bila dihapus atau tidak boleh dilihat pembaca ini; sebabnya tidak dibedakan.
const post = computed(() => ('unavailable' in props.original ? null : props.original))

const router = useRouter()
const route = useRoute()
// Klik teks atau gambar membuka post asal (hashtag/tautan tetap berfungsi, seleksi teks tidak memicu).
function openOriginal(e: MouseEvent) {
  if (!post.value || (e.target as HTMLElement).closest('a')) return
  if (window.getSelection()?.toString()) return
  const path = `/posts/${post.value.id}`
  if (route.path !== path) void router.push(path)
}
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
          <RouterLink class="shared__time" :to="`/posts/${post.id}`">{{
            formatTime(post.createdAt)
          }}</RouterLink>
        </div>
      </div>
      <!-- Isi asal selalu teks, tidak pernah HTML. -->
      <p v-if="post.content" class="shared__text shared__open" @click="openOriginal">
        <HashtagText :text="post.content" />
      </p>
      <img
        v-if="post.imageUrl"
        class="shared__image shared__open"
        :src="post.imageUrl"
        :alt="t('post.image.alt', { name: post.author.displayName })"
        loading="lazy"
        @click="openOriginal"
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
  display: block;
  color: var(--c-text-muted);
}
.shared__text {
  margin: 0;
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.shared__open {
  cursor: pointer;
}
.shared__image {
  display: block;
  width: 100%;
  height: auto;
}
</style>
