<script setup lang="ts">
import {
  POST_FEELINGS,
  PRIVACIES,
  type Post,
  type PostFeeling,
  type Privacy,
  type UserSummary,
} from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, nextTick, ref } from 'vue'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import { useFeedStore } from '@/modules/feed/stores'
import { imageProblem } from '@/helpers/image'
import { PRIVACY_ICONS } from '@/helpers/privacy'
import Button from '@/components/Button.vue'
import TagSuggestions from '@/modules/feed/components/TagSuggestions.vue'

/** Bila diisi, post ditulis di dinding teman ini (WAL-01) dan privasi tidak dipilih (BR-04). */
const props = defineProps<{ wallOwner?: Pick<UserSummary, 'username' | 'displayName'> }>()
const emit = defineEmits<{ posted: [post: Post] }>()
const MAX_TAGS = 10
const feed = useFeedStore()
const content = ref('')
const privacy = ref<Privacy | ''>('')
const feeling = ref<PostFeeling | ''>('')
const imageUrl = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const busy = ref(false)
const focused = ref(false)
/** Footer tampil saat kotak difokus atau ada isi, seperti referensi (ref-1). */
const expanded = computed(
  () => focused.value || content.value !== '' || imageUrl.value !== null || tagged.value.length > 0,
)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const draftInput = ref<HTMLTextAreaElement | null>(null)
const suggestions = ref<InstanceType<typeof TagSuggestions> | null>(null)
const tagged = ref<UserSummary[]>([])
/** Teks setelah "@" di depan kursor (WAL-02); null bila tidak sedang mengetik tag. */
const mention = ref<string | null>(null)
let mentionStart = 0

function detectMention() {
  const el = draftInput.value
  if (!el) return
  const pos = el.selectionStart
  const m = /(^|\s)@([^\s@]{0,30})$/.exec(content.value.slice(0, pos))
  mention.value = m ? m[2]! : null
  if (m) mentionStart = pos - m[2]!.length - 1
}

function addTag(user: UserSummary) {
  const el = draftInput.value
  const pos = el?.selectionStart ?? content.value.length
  // "@kata" yang diketik diganti chip, bukan tertinggal di teks.
  content.value = content.value.slice(0, mentionStart) + content.value.slice(pos)
  if (tagged.value.length < MAX_TAGS && !tagged.value.some((u) => u.id === user.id)) {
    tagged.value.push(user)
  }
  mention.value = null
  void nextTick(() => {
    el?.focus()
    el?.setSelectionRange(mentionStart, mentionStart)
  })
}

function onKeydown(e: KeyboardEvent) {
  if (mention.value !== null && suggestions.value?.handleKey(e)) e.preventDefault()
}

function onFocusout(e: FocusEvent) {
  focused.value = (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)
}

function focusDraft() {
  draftInput.value?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  draftInput.value?.focus({ preventScroll: true })
}

defineExpose({ focusDraft })

const canPost = computed(
  () => !busy.value && (content.value.trim() !== '' || imageUrl.value !== null),
)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  const problem = imageProblem(file)
  if (problem) return void (error.value = t(problem))
  busy.value = true
  try {
    imageUrl.value = (await postsApi.uploadImage(file)).url
    previewUrl.value = imageUrl.value
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('error.network')
  } finally {
    busy.value = false
  }
}

function removePhoto() {
  imageUrl.value = null
  previewUrl.value = null
}

async function submit() {
  if (!canPost.value) return
  busy.value = true
  error.value = ''
  try {
    const post = await postsApi.create({
      content: content.value,
      ...(privacy.value ? { privacy: privacy.value } : {}),
      ...(feeling.value ? { feeling: feeling.value } : {}),
      imageUrl: imageUrl.value,
      ...(props.wallOwner ? { wallOwnerUsername: props.wallOwner.username } : {}),
      ...(tagged.value.length ? { taggedUserIds: tagged.value.map((u) => u.id) } : {}),
    })
    feed.prepend(post)
    emit('posted', post)
    content.value = ''
    feeling.value = ''
    tagged.value = []
    mention.value = null
    removePhoto()
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('error.network')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="status" @submit.prevent="submit" @focusin="focused = true" @focusout="onFocusout">
    <div class="status__tabs">
      <span class="status__tab status__tab--active">
        <Icon icon="mdi:text-box-edit-outline" aria-hidden="true" />{{ t('statusBox.tab.status') }}
      </span>
      <button class="status__tab" type="button" @click="fileInput?.click()">
        <Icon icon="mdi:image-multiple-outline" aria-hidden="true" />{{ t('statusBox.tab.photo') }}
      </button>
      <input
        ref="fileInput"
        class="status__file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        @change="onFile"
      />
    </div>

    <div class="status__body">
      <textarea
        ref="draftInput"
        v-model="content"
        class="status__text"
        rows="2"
        maxlength="5000"
        :placeholder="
          wallOwner
            ? t('statusBox.wall.placeholder', { name: wallOwner.displayName })
            : t('statusBox.placeholder')
        "
        :aria-label="
          wallOwner
            ? t('statusBox.wall.placeholder', { name: wallOwner.displayName })
            : t('statusBox.placeholder')
        "
        :aria-expanded="mention !== null"
        aria-autocomplete="list"
        :title="t('statusBox.tag.hint')"
        @input="detectMention"
        @click="detectMention"
        @keyup.left.right="detectMention"
        @keydown="onKeydown"
      />
      <TagSuggestions
        v-if="mention !== null"
        ref="suggestions"
        :query="mention"
        :exclude="tagged.map((u) => u.id)"
        @pick="addTag"
        @close="mention = null"
      />
      <p v-if="tagged.length" class="status__tagged">
        {{ t('statusBox.tag.with') }}:
        <span v-for="u in tagged" :key="u.id" class="status__chip">
          {{ u.displayName }}
          <button
            type="button"
            :aria-label="t('statusBox.tag.remove', { name: u.displayName })"
            @click="tagged = tagged.filter((x) => x.id !== u.id)"
          >
            ×
          </button>
        </span>
      </p>
      <div v-if="previewUrl" class="status__preview">
        <img :src="previewUrl" :alt="t('statusBox.photoPreview')" />
        <button
          type="button"
          class="status__remove"
          :aria-label="t('statusBox.removePhoto')"
          @click="removePhoto"
        >
          <Icon icon="mdi:close" aria-hidden="true" />
        </button>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>

    <div v-show="expanded" class="status__foot">
      <select v-model="feeling" class="status__privacy" :aria-label="t('statusBox.feeling')">
        <option value="">{{ t('statusBox.feeling.none') }}</option>
        <option v-for="option in POST_FEELINGS" :key="option" :value="option">{{ option }}</option>
      </select>
      <span v-if="!wallOwner" class="status__privacy-wrap">
        <Icon :icon="PRIVACY_ICONS[privacy || 'FRIENDS']" aria-hidden="true" />
        <select v-model="privacy" class="status__privacy" :aria-label="t('statusBox.privacy')">
          <option value="">{{ t('statusBox.privacy.default') }}</option>
          <option v-for="p in PRIVACIES" :key="p" :value="p">{{ t(`privacy.${p}`) }}</option>
        </select>
      </span>
      <Button type="submit" :disabled="!canPost">{{ t('statusBox.post') }}</Button>
    </div>
  </form>
</template>

<style scoped>
.status {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.status__tabs {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
}
.status__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-text);
  font: inherit;
  font-weight: bold;
  cursor: pointer;
}
.status__tab:hover:not(:disabled) {
  text-decoration: underline;
}
.status__tab:disabled {
  color: var(--c-text-muted);
  cursor: default;
}
.status__tab--active {
  cursor: default;
}
.status__file {
  display: none;
}
.status__body {
  padding: var(--sp-3);
}
.status__text {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  outline: 0;
  resize: none;
  font: inherit;
  font-size: var(--fs-post);
  color: var(--c-text);
  background: none;
}
.status__preview {
  position: relative;
  display: inline-block;
  margin-top: var(--sp-2);
}
.status__preview img {
  display: block;
  max-width: 100%;
  max-height: 200px;
  border: var(--card-border);
}
.status__remove {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.6);
  color: var(--c-text-on-brand);
  cursor: pointer;
}
.status__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-top: 1px solid var(--c-border-soft);
}
.status__privacy-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.status__privacy {
  font: inherit;
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
}
.status__tagged {
  margin: var(--sp-2) 0 0;
  color: var(--c-text-muted);
}
.status__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-left: var(--sp-1);
  padding: 0 var(--sp-1);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border);
  color: var(--c-text);
}
.status__chip button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font: inherit;
  cursor: pointer;
}
</style>
