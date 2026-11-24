<script setup lang="ts">
import type { Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { formatTime } from '../utils/time'
import Avatar from './Avatar.vue'
import CommentList from './CommentList.vue'
import SharePanel from './SharePanel.vue'
import SharedPostCard from './SharedPostCard.vue'
import LikeSummary from './LikeSummary.vue'
import PostActions from './PostActions.vue'

const props = defineProps<{ post: Post }>()
const emit = defineEmits<{
  delete: [id: number]
  'toggle-like': [id: number]
  'comment-count': [id: number, delta: number]
  shared: [post: Post]
}>()
const sharing = ref(false)
const comments = ref<InstanceType<typeof CommentList> | null>(null)

const auth = useAuthStore()
const menuOpen = ref(false)
const isMine = computed(() => auth.user?.id === props.post.author.id)
const when = computed(() => formatTime(props.post.createdAt))
// Ikon privasi sederhana; ikon retro khusus menyusul bersama aset.
const PRIVACY_ICON = { PUBLIC: '🌐', FRIENDS: '👥', ONLY_ME: '🔒' } as const

function remove() {
  menuOpen.value = false
  if (window.confirm(t('post.delete.confirm'))) emit('delete', props.post.id)
}
</script>

<template>
  <article class="post">
    <header class="post__head">
      <Avatar :name="post.author.displayName" :src="post.author.avatarUrl" size="m" />
      <div class="post__who">
        <RouterLink class="post__name" :to="`/${post.author.username}`">{{
          post.author.displayName
        }}</RouterLink>
        <div class="post__meta">
          <span>{{ when }}</span>
          <span
            :title="t(`privacy.${post.privacy}`)"
            :aria-label="t(`privacy.${post.privacy}`)"
            role="img"
            >{{ PRIVACY_ICON[post.privacy] }}</span
          >
          <span v-if="post.editedAt">· {{ t('post.edited') }}</span>
        </div>
      </div>
      <div v-if="isMine" class="post__menu">
        <button
          class="post__dots"
          type="button"
          :aria-label="t('post.menu')"
          aria-haspopup="true"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          …
        </button>
        <div v-if="menuOpen" class="post__dropdown">
          <button type="button" class="post__item" @click="remove">{{ t('post.delete') }}</button>
        </div>
      </div>
    </header>

    <!-- Konten pengguna selalu ditampilkan sebagai teks, tidak pernah sebagai HTML. -->
    <p v-if="post.content" class="post__text">{{ post.content }}</p>
    <img
      v-if="post.imageUrl"
      class="post__image"
      :src="post.imageUrl"
      :alt="t('post.image.alt', { name: post.author.displayName })"
      loading="lazy"
    />

    <SharedPostCard v-if="post.sharedFrom" :original="post.sharedFrom" />

    <PostActions
      :liked="post.likedByMe"
      @toggle-like="emit('toggle-like', post.id)"
      @comment="comments?.focusInput()"
      @share="sharing = !sharing"
    />
    <SharePanel
      v-if="sharing"
      :post-id="post.id"
      @cancel="sharing = false"
      @shared="
        (p) => {
          sharing = false
          emit('shared', p)
        }
      "
    />
    <LikeSummary :post="post" />
    <CommentList
      ref="comments"
      :post-id="post.id"
      :post-author-id="post.author.id"
      :comment-count="post.commentCount"
      @count-change="(d) => emit('comment-count', post.id, d)"
    />
  </article>
</template>

<style scoped>
.post {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.post__head {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3) 0;
}
.post__who {
  flex: 1;
  min-width: 0;
}
.post__name {
  font-size: var(--fs-post);
  font-weight: bold;
}
.post__meta {
  display: flex;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.post__text {
  margin: 0;
  padding: var(--sp-3);
  font-size: var(--fs-post);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.post__image {
  display: block;
  width: 100%;
  height: auto;
}
.post__menu {
  position: relative;
}
.post__dots {
  padding: 0 var(--sp-2);
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font-size: var(--fs-title);
  line-height: 1;
  cursor: pointer;
}
.post__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 5;
  min-width: 120px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.post__item {
  display: block;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.post__item:hover {
  background: var(--c-hover-bg);
}
</style>
