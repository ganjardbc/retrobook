<script setup lang="ts">
import {
  POST_FEELINGS,
  PRIVACIES,
  type Post,
  type PostFeeling,
  type Privacy,
} from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import { formatTime } from '@/helpers/time'
import { useDismissOnOutside } from '@/composables/dismissOnOutside'
import Avatar from '@/components/Avatar.vue'
import HashtagText from '@/modules/posts/components/HashtagText.vue'
import ReportDialog from '@/modules/posts/components/ReportDialog.vue'
import CommentList from '@/modules/posts/components/CommentList.vue'
import SharePanel from '@/modules/posts/components/SharePanel.vue'
import SharedPostCard from '@/modules/posts/components/SharedPostCard.vue'
import LikeSummary from '@/modules/posts/components/LikeSummary.vue'
import PostActions from '@/modules/posts/components/PostActions.vue'
import Button from '@/components/Button.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import { PRIVACY_ICONS } from '@/helpers/privacy'

const props = defineProps<{ post: Post }>()
const emit = defineEmits<{
  delete: [id: string]
  'toggle-like': [id: string]
  'comment-count': [id: string, delta: number]
  shared: [post: Post]
  updated: [post: Post]
}>()
const sharing = ref(false)
async function toggleSave() {
  try {
    const r = props.post.savedByMe
      ? await postsApi.unsave(props.post.id)
      : await postsApi.save(props.post.id)
    emit('updated', { ...props.post, savedByMe: r.savedByMe })
  } catch {
    /* gagal: tombol tetap pada keadaan semula */
  }
}
const comments = ref<InstanceType<typeof CommentList> | null>(null)
const editing = ref(false)
const saving = ref(false)
const editContent = ref('')
const editPrivacy = ref<Privacy>('FRIENDS')
const editFeeling = ref<PostFeeling | ''>('')
const editError = ref('')

const privacyOptions = computed<IconOption[]>(() =>
  PRIVACIES.map((p) => ({ value: p, label: t(`privacy.${p}`), icon: PRIVACY_ICONS[p] })),
)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const detailPath = computed(() => `/posts/${props.post.id}`)
// Klik pada teks atau gambar post membuka detail (kecuali sedang menyeleksi teks).
function openDetail(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a')) return // hashtag/tautan tetap berfungsi
  if (window.getSelection()?.toString()) return
  if (route.path !== detailPath.value) void router.push(detailPath.value)
}
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
useDismissOnOutside(menuRoot, menuOpen)
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
  editFeeling.value = (props.post.feeling as PostFeeling | null) ?? ''
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
      feeling: editFeeling.value || null,
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
        <span v-if="post.feeling" class="post__feeling"> {{ post.feeling }}</span>
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
          <RouterLink class="post__time" :to="detailPath">{{ when }}</RouterLink>
          <span
            :title="t(`privacy.${post.privacy}`)"
            :aria-label="t(`privacy.${post.privacy}`)"
            role="img"
            >{{ PRIVACY_ICON[post.privacy] }}</span
          >
          <span v-if="post.editedAt">· {{ t('post.edited') }}</span>
        </div>
      </div>
      <div ref="menuRoot" class="post__menu">
        <button
          class="post__dots"
          type="button"
          :aria-label="t('post.menu')"
          aria-haspopup="true"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <Icon icon="mdi:chevron-down" aria-hidden="true" />
        </button>
        <div v-if="menuOpen" class="post__dropdown">
          <RouterLink :to="detailPath" class="post__open" @click="menuOpen = false">
            {{ t('post.open') }}
          </RouterLink>
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
      <p v-if="editError" class="form-error post__edit-error" role="alert">{{ editError }}</p>
      <div class="post__edit-foot">
        <IconSelect
          v-if="!post.wallOwner"
          v-model="editPrivacy"
          :options="privacyOptions"
          :label="t('statusBox.privacy')"
        />
        <select
          v-model="editFeeling"
          class="post__edit-select"
          :aria-label="t('statusBox.feeling')"
        >
          <option value="">{{ t('statusBox.feeling.none') }}</option>
          <option v-for="option in POST_FEELINGS" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <div class="post__edit-actions">
          <Button variant="default" @click="editing = false">{{ t('edit.cancel') }}</Button>
          <Button type="submit" :disabled="saving">{{ t('edit.save') }}</Button>
        </div>
      </div>
    </form>
    <p v-else-if="post.content" class="post__text" @click="openDetail">
      <HashtagText :text="post.content" />
    </p>
    <img
      v-if="post.imageUrl"
      class="post__image"
      :src="post.imageUrl"
      :alt="t('post.image.alt', { name: post.author.displayName })"
      loading="lazy"
      @click="openDetail"
    />

    <SharedPostCard v-if="post.sharedFrom" :original="post.sharedFrom" />

    <PostActions
      :liked="post.likedByMe"
      :saved="post.savedByMe"
      @toggle-save="toggleSave"
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
  padding: var(--sp-3);
}
.post__who {
  flex: 1;
  min-width: 0;
}
.post__name {
  font-size: var(--fs-post);
  font-weight: bold;
}
.post__time {
  color: inherit;
}
.post__meta {
  display: flex;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.post__text,
.post__image {
  cursor: pointer;
}
.post__text {
  margin: 0;
  padding: 0 var(--sp-3) var(--sp-3);
  font-size: var(--fs-post);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.post__editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: 0 var(--sp-3) var(--sp-3);
}
.post__edit-text {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: var(--sp-2);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  font: inherit;
  font-size: var(--fs-post);
  resize: none;
}
.post__edit-text:focus {
  border-color: var(--c-brand);
  outline: 0;
}
.post__edit-error {
  margin: 0;
}
/* Satu baris seperti footer status box: privasi, perasaan, lalu aksi di kanan. */
.post__edit-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}
.post__edit-select {
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
  font: inherit;
}
.post__edit-actions {
  display: flex;
  gap: var(--sp-2);
  margin-left: auto;
}
.post__image {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 520px;
  object-fit: contain;
}
.post__menu {
  position: relative;
}
.post__dots {
  padding: 0 var(--sp-2);
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.post__dots:hover {
  color: var(--c-text);
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
.post__item,
.post__open {
  display: block;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.post__item:hover,
.post__open:hover {
  background: var(--c-hover-bg);
  text-decoration: none;
}
</style>
