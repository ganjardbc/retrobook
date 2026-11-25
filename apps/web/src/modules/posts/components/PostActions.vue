<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'

// Bukan tombol ikon besar: tautan teks seperti era 2015 (UX-04). Comment dan Share menyusul di T-16 dan T-23.
defineProps<{ liked: boolean; saved?: boolean; busy?: boolean }>()
defineEmits<{ 'toggle-like': []; 'toggle-save': []; comment: []; share: [] }>()
</script>

<template>
  <div class="actions">
    <button
      class="actions__link"
      type="button"
      :disabled="busy"
      :aria-pressed="liked"
      @click="$emit('toggle-like')"
    >
      {{ liked ? t('like.unlike') : t('like.action') }}
    </button>
    <span class="actions__dot" aria-hidden="true">·</span>
    <button class="actions__link" type="button" @click="$emit('comment')">
      {{ t('comment.action') }}
    </button>
    <span class="actions__dot" aria-hidden="true">·</span>
    <button class="actions__link" type="button" @click="$emit('share')">
      {{ t('share.action') }}
    </button>
    <span class="actions__dot" aria-hidden="true">·</span>
    <button class="actions__link" type="button" :aria-pressed="saved" @click="$emit('toggle-save')">
      {{ saved ? t('saved.unsave') : t('saved.action') }}
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
}
.actions__dot {
  color: var(--c-text-muted);
}
.actions__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.actions__link:hover:not(:disabled) {
  text-decoration: underline;
}
.actions__link:disabled {
  color: var(--c-text-muted);
  cursor: default;
}
</style>
