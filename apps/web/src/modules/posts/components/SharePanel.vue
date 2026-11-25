<script setup lang="ts">
import { PRIVACIES, type Post, type Privacy } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { ref } from 'vue'
import { ApiRequestError } from '@/plugins/http'
import { postsApi } from '@/modules/posts/services/api'
import Button from '@/components/Button.vue'

const props = defineProps<{ postId: string }>()
const emit = defineEmits<{ shared: [post: Post]; cancel: [] }>()

const content = ref('')
const privacy = ref<Privacy>('FRIENDS')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const post = await postsApi.share(props.postId, {
      content: content.value,
      privacy: privacy.value,
    })
    emit('shared', post)
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('share.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="share" :aria-label="t('share.label')" @submit.prevent="submit">
    <textarea
      v-model="content"
      class="share__text"
      rows="2"
      maxlength="5000"
      :placeholder="t('share.placeholder')"
      :aria-label="t('share.placeholder')"
    />
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="share__foot">
      <select v-model="privacy" class="share__privacy" :aria-label="t('statusBox.privacy')">
        <option v-for="p in PRIVACIES" :key="p" :value="p">{{ t(`privacy.${p}`) }}</option>
      </select>
      <Button variant="default" @click="emit('cancel')">{{ t('share.cancel') }}</Button>
      <Button type="submit" :disabled="busy">{{ t('share.submit') }}</Button>
    </div>
  </form>
</template>

<style scoped>
.share {
  padding: var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
  background: var(--c-card-subtle);
}
.share__text {
  display: block;
  width: 100%;
  padding: var(--sp-2);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  font: inherit;
  resize: vertical;
}
.share__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}
.share__privacy {
  font: inherit;
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
}
</style>
