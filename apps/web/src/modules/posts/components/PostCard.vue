<script setup lang="ts">
import { PRIVACIES, type Post, type Privacy } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import { formatTime } from '@/helpers/time'
import Avatar from '@/components/Avatar.vue'
import HashtagText from '@/modules/posts/components/HashtagText.vue'
import ReportDialog from '@/modules/posts/components/ReportDialog.vue'
import CommentList from '@/modules/posts/components/CommentList.vue'
import SharePanel from '@/modules/posts/components/SharePanel.vue'
import SharedPostCard from '@/modules/posts/components/SharedPostCard.vue'
import LikeSummary from '@/modules/posts/components/LikeSummary.vue'
import PostActions from '@/modules/posts/components/PostActions.vue'
import Button from '@/components/Button.vue'

const props = defineProps<{ post: Post }>()
const emit = defineEmits<{
  delete: [id: number]
  'toggle-like': [id: number]
  'comment-count': [id: number, delta: number]
  shared: [post: Post]
  updated: [post: Post]
}>()
const sharing = ref(false)
const comments = ref<InstanceType<typeof CommentList> | null>(null)
const editing = ref(false)
const saving = ref(false)
const editContent = ref('')
const editPrivacy = ref<Privacy>('FRIENDS')
const editError = ref('')

const auth = useAuthStore()
const menuOpen = ref(false)
const reporting = ref(false)
const isMine = computed(() => auth.user?.id === props.post.author.id)
// BR-04: pemilik dinding boleh menghapus wall post dari dindingnya, tetapi tidak mengeditnya.
const isWallOwner = computed(() => auth.user?.id === props.post.wallOwner?.id)
// "with A", "with A and B", "with A and N others" (UX 2015).
const withFirst = computed(() => props.post.tags.slice(0, 2))
const withOthers = computed(() => Math.max(0, props.post.tags.length - 2))
const withOthersText = computed(() =>
  withOthers.value === 0
    ? ''
    : ` ${t('post.and')} ${withOthers.value === 1 ? t('post.other') : t('post.others', { n: withOthers.value })}`,
)
const when = computed(() => formatTime(props.post.createdAt))
// Ikon privasi sederhana; ikon retro khusus menyusul bersama aset.
const PRIVACY_ICON = { PUBLIC: '🌐', FRIENDS: '👥', ONLY_ME: '🔒' } as const

function remove() {
  menuOpen.value = false
  if (window.confirm(t('post.delete.confirm'))) emit('delete', props.post.id)
}

function startEdit() {
  menuOpen.value = false
  editContent.value = props.post.content
  editPrivacy.value = props.post.privacy
  editError.value = ''
  editing.value = true
}

async function saveEdit() {
  if (saving.value) return
  saving.value = true
  editError.value = ''
  try {
    const updated = await postsApi.update(props.post.id, {
      content: editContent.value,
      privacy: editPrivacy.value,
    })
    emit('updated', updated)
    editing.value = false
  } catch (error) {
    editError.value =
      error instanceof ApiRequestError ? error.messages.join(' ') : t('error.network')
  } finally {
    saving.value = false
  }
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
        <template v-if="post.wallOwner">
          <span class="post__arrow" aria-hidden="true"> ▸ </span>
          <span class="visually-hidden"> {{ t('post.to') }} </span>
          <RouterLink class="post__name" :to="`/${post.wallOwner.username}`">{{
            post.wallOwner.displayName
          }}</RouterLink>
        </template>
        <span v-if="post.tags.length" class="post__with">
          {{ ` — ${t('post.with')} ` }}
          <template v-for="(tag, i) in withFirst" :key="tag.id">
            {{ i === 0 ? '' : withOthers ? ', ' : ` ${t('post.and')} ` }}
            <RouterLink class="post__name" :to="`/${tag.username}`">{{
              tag.displayName
            }}</RouterLink>
          </template>
          {{ withOthersText }}
        </span>
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
      <div class="post__menu">
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
          <button v-if="isMine" type="button" class="post__item" @click="startEdit">
            {{ t('post.edit') }}
          </button>
          <button v-if="isMine || isWallOwner" type="button" class="post__item" @click="remove">
            {{ t('post.delete') }}
          </button>
          <button
            v-if="!isMine"
            type="button"
            class="post__item"
            @click="((reporting = true), (menuOpen = false))"
          >
            {{ t('report.action') }}
          </button>
        </div>
      </div>
    </header>

    <!-- Konten pengguna selalu ditampilkan sebagai teks, tidak pernah sebagai HTML. -->
    <form v-if="editing" class="post__editor" @submit.prevent="saveEdit">
      <textarea
        v-model="editContent"
        class="post__edit-text"
        rows="3"
        maxlength="5000"
        :aria-label="t('post.edit.placeholder')"
      />
      <select
        v-if="!post.wallOwner"
        v-model="editPrivacy"
        class="post__edit-privacy"
        :aria-label="t('statusBox.privacy')"
      >
        <option v-for="privacy in PRIVACIES" :key="privacy" :value="privacy">
          {{ t(`privacy.${privacy}`) }}
        </option>
      </select>
      <p v-if="editError" class="form-error" role="alert">{{ editError }}</p>
      <div class="post__edit-actions">
        <Button variant="default" @click="editing = false">{{ t('edit.cancel') }}</Button>
        <Button type="submit" :disabled="saving">{{ t('edit.save') }}</Button>
      </div>
    </form>
    <p v-else-if="post.content" class="post__text"><HashtagText :text="post.content" /></p>
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
    <ReportDialog
      v-if="reporting"
      target-type="POST"
      :target-id="post.id"
      @close="reporting = false"
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
.post__editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
}
.post__edit-text {
  width: 100%;
  padding: var(--sp-2);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  font: inherit;
  resize: vertical;
}
.post__edit-privacy {
  align-self: flex-start;
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
  font: inherit;
}
.post__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
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
