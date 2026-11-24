<script setup lang="ts">
import { PRIVACIES, type Post, type Privacy } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed, ref } from 'vue'
import { ApiRequestError } from '../api/http'
import { postsApi } from '../api/posts'
import { useFeedStore } from '../stores/feed'
import Button from './Button.vue'

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emit = defineEmits<{ posted: [post: Post] }>()
const feed = useFeedStore()
const content = ref('')
const privacy = ref<Privacy>('FRIENDS')
const imageUrl = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const busy = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const canPost = computed(
  () => !busy.value && (content.value.trim() !== '' || imageUrl.value !== null),
)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  // Pemeriksaan sungguhan ada di server; ini hanya agar umpan balik cepat.
  if (!TYPES.includes(file.type)) return void (error.value = t('statusBox.error.type'))
  if (file.size > MAX_BYTES) return void (error.value = t('statusBox.error.size'))
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
      privacy: privacy.value,
      imageUrl: imageUrl.value,
    })
    feed.prepend(post)
    emit('posted', post)
    content.value = ''
    removePhoto()
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('error.network')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="status" @submit.prevent="submit">
    <div class="status__tabs">
      <span class="status__tab status__tab--active">{{ t('statusBox.tab.status') }}</span>
      <button class="status__tab" type="button" @click="fileInput?.click()">
        {{ t('statusBox.tab.photo') }}
      </button>
      <!-- Life Event menunggu Fase 3 (UX-06). -->
      <button class="status__tab" type="button" disabled>{{ t('statusBox.tab.lifeEvent') }}</button>
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
        v-model="content"
        class="status__text"
        rows="2"
        maxlength="5000"
        :placeholder="t('statusBox.placeholder')"
        :aria-label="t('statusBox.placeholder')"
      />
      <div v-if="previewUrl" class="status__preview">
        <img :src="previewUrl" :alt="t('statusBox.photoPreview')" />
        <button
          type="button"
          class="status__remove"
          :aria-label="t('statusBox.removePhoto')"
          @click="removePhoto"
        >
          ×
        </button>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>

    <div class="status__foot">
      <select v-model="privacy" class="status__privacy" :aria-label="t('statusBox.privacy')">
        <option v-for="p in PRIVACIES" :key="p" :value="p">{{ t(`privacy.${p}`) }}</option>
      </select>
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
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
}
.status__tab {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
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
  color: var(--c-text);
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
  resize: vertical;
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
.status__privacy {
  font: inherit;
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
}
</style>
