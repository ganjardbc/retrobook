<script setup lang="ts">
import type { Comment } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { commentsApi } from '@/modules/posts/services/comments'
import { useAuthStore } from '@/modules/auth/stores'
import { formatTime } from '@/helpers/time'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import ReportDialog from '@/modules/posts/components/ReportDialog.vue'
import { postsApi } from '@/modules/posts/services/api'
import { imageProblem } from '@/helpers/image'

const props = defineProps<{ postId: number; postAuthorId: number; commentCount: number }>()
const emit = defineEmits<{ 'count-change': [delta: number] }>()

const auth = useAuthStore()
const comments = ref<Comment[]>([])
const nextCursor = ref<number | null>(null)
const expanded = ref(false)
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const draft = ref('')
const input = ref<HTMLInputElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const imageUrl = ref<string | null>(null)

const viewLabel = computed(() =>
  props.commentCount === 1
    ? t('comments.view.one')
    : t('comments.view.many', { n: props.commentCount }),
)
const reportingId = ref<number | null>(null)
const canReport = (c: Comment) => auth.user?.id !== c.author.id
const canDelete = (c: Comment) =>
  auth.user?.id === c.author.id || auth.user?.id === props.postAuthorId

function merge(items: Comment[]) {
  const known = new Set(comments.value.map((c) => c.id))
  comments.value.push(...items.filter((c) => !known.has(c.id)))
}

/** Halaman pertama (lama ke baru) atau berikutnya; panggilan saat memuat diabaikan. */
async function load(first: boolean) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const page = await commentsApi.list(props.postId, first ? null : nextCursor.value)
    if (first) comments.value = []
    merge(page.items)
    nextCursor.value = page.nextCursor
    expanded.value = true
  } catch {
    error.value = t('comments.error.load')
  } finally {
    loading.value = false
  }
}

async function send() {
  const content = draft.value
  if (sending.value || (!content.trim() && !imageUrl.value)) return
  sending.value = true
  error.value = ''
  try {
    const created = imageUrl.value
      ? await commentsApi.create(props.postId, content, imageUrl.value)
      : await commentsApi.create(props.postId, content)
    draft.value = ''
    imageUrl.value = null
    emit('count-change', 1)
    // Daftar belum dibuka tapi sudah ada komentar lain: buka dari awal agar urutannya benar.
    if (!expanded.value && props.commentCount > 1) await load(true)
    else {
      merge([created])
      expanded.value = true
    }
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('comments.error.send')
  } finally {
    sending.value = false
  }
}

async function onPhoto(event: Event) {
  const el = event.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  const problem = imageProblem(file)
  if (problem) return void (error.value = t(problem))
  sending.value = true
  error.value = ''
  try {
    imageUrl.value = (await postsApi.uploadImage(file)).url
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : t('comments.error.send')
  } finally {
    sending.value = false
  }
}

async function remove(c: Comment) {
  if (!window.confirm(t('comments.delete.confirm'))) return
  try {
    await commentsApi.remove(c.id)
    comments.value = comments.value.filter((x) => x.id !== c.id)
    emit('count-change', -1)
  } catch {
    error.value = t('comments.error.load')
  }
}

async function toggleLike(comment: Comment) {
  try {
    const result = comment.likedByMe
      ? await commentsApi.unlike(comment.id)
      : await commentsApi.like(comment.id)
    comment.likeCount = result.likeCount
    comment.likedByMe = result.likedByMe
  } catch (cause) {
    error.value = cause instanceof ApiRequestError ? cause.messages.join(' ') : t('like.error')
  }
}

defineExpose({ focusInput: () => input.value?.focus() })
</script>

<template>
  <section class="comments" :aria-label="t('comments.list')">
    <button
      v-if="!expanded && commentCount > 0"
      class="comments__link"
      type="button"
      :disabled="loading"
      @click="load(true)"
    >
      {{ viewLabel }}
    </button>

    <ReportDialog
      v-if="reportingId !== null"
      target-type="COMMENT"
      :target-id="reportingId"
      @close="reportingId = null"
    />

    <ul v-if="comments.length" class="comments__list">
      <li v-for="c in comments" :key="c.id" class="comment">
        <Avatar :name="c.author.displayName" :src="c.author.avatarUrl" size="s" />
        <div class="comment__body">
          <!-- Isi komentar selalu teks, tidak pernah HTML. -->
          <p class="comment__text">
            <RouterLink class="comment__name" :to="`/${c.author.username}`">{{
              c.author.displayName
            }}</RouterLink>
            {{ c.content }}
          </p>
          <img v-if="c.imageUrl" class="comment__image" :src="c.imageUrl" alt="Foto di komentar" />
          <div class="comment__meta">
            <span>{{ formatTime(c.createdAt) }}</span>
            <button type="button" class="comments__link" @click="toggleLike(c)">
              {{ c.likedByMe ? 'Unlike' : 'Like' }} · {{ c.likeCount }}
            </button>
            <button
              v-if="canDelete(c)"
              class="comments__link comments__delete"
              type="button"
              @click="remove(c)"
            >
              {{ t('comments.delete') }}
            </button>
            <button
              v-if="canReport(c)"
              class="comments__link"
              type="button"
              @click="reportingId = c.id"
            >
              {{ t('report.action') }}
            </button>
          </div>
        </div>
      </li>
    </ul>

    <button
      v-if="expanded && nextCursor"
      class="comments__link"
      type="button"
      :disabled="loading"
      @click="load(false)"
    >
      {{ t('comments.more') }}
    </button>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>

    <form v-if="auth.user" class="comments__form" @submit.prevent="send">
      <Avatar :name="auth.user.displayName" :src="auth.user.avatarUrl" size="s" />
      <div class="comments__field">
        <input
          ref="input"
          v-model="draft"
          class="comments__input"
          maxlength="2000"
          :placeholder="t('comments.placeholder')"
          :aria-label="t('comments.placeholder')"
          :disabled="sending"
        />
        <input
          ref="photoInput"
          class="comments__file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onPhoto"
        />
        <button
          type="button"
          class="comments__camera"
          :title="t('comments.photo')"
          :aria-label="t('comments.photo')"
          :disabled="sending"
          @click="photoInput?.click()"
        >
          <Icon icon="mdi:camera" aria-hidden="true" />
        </button>
      </div>
      <Button type="submit" :disabled="sending || (!draft.trim() && !imageUrl)">Kirim</Button>
    </form>
    <div v-if="imageUrl" class="comments__preview">
      <img :src="imageUrl" :alt="t('comments.photoPreview')" />
      <button
        type="button"
        class="comments__remove"
        :aria-label="t('comments.removePhoto')"
        @click="imageUrl = null"
      >
        <Icon icon="mdi:close" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
  background: var(--c-card-subtle);
}
.comments__list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.comment {
  display: flex;
  gap: var(--sp-2);
}
.comment__body {
  flex: 1;
  min-width: 0;
}
.comment__text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.comment__name {
  font-weight: bold;
}
.comment__meta {
  display: flex;
  gap: var(--sp-2);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.comment__image {
  display: block;
  max-width: min(100%, 360px);
  max-height: 360px;
  object-fit: contain;
  border-radius: var(--radius);
}
.comments__link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.comments__link:hover:not(:disabled) {
  text-decoration: underline;
}
.comments__form {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.comments__field {
  position: relative;
  flex: 1;
  min-width: 0;
}
.comments__input {
  width: 100%;
  box-sizing: border-box;
  padding-right: 28px;
}
.comments__file {
  display: none;
}
.comments__camera {
  position: absolute;
  top: 50%;
  right: var(--sp-1);
  display: inline-flex;
  padding: var(--sp-1);
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font-size: 16px;
  cursor: pointer;
  transform: translateY(-50%);
}
.comments__camera:hover:not(:disabled) {
  color: var(--c-text);
}
.comments__preview {
  position: relative;
  align-self: flex-start;
  margin-left: calc(var(--avatar-s, 32px) + var(--sp-2));
}
.comments__preview img {
  display: block;
  max-width: 120px;
  max-height: 100px;
  object-fit: cover;
  border: var(--card-border);
}
.comments__remove {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.6);
  color: var(--c-text-on-brand);
  cursor: pointer;
}
</style>
