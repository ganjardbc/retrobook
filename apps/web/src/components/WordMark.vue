<script setup lang="ts">
import { APP_NAME } from '@retrobook/shared'

/** `text`: nama saja (halaman tamu, legal). `mark`: hanya kotak berinisial, gaya lockup admin (navbar AppLayout). */
withDefaults(defineProps<{ variant?: 'text' | 'mark' }>(), { variant: 'text' })
</script>

<template>
  <span v-if="variant === 'mark'" class="wordmark wordmark--mark" role="img" :aria-label="APP_NAME">
    <span class="wordmark__mark" aria-hidden="true">{{ APP_NAME.slice(0, 1) }}</span>
  </span>
  <span v-else class="wordmark">{{ APP_NAME }}</span>
</template>

<style scoped>
/* Logo teks sementara (D-1). */
.wordmark {
  color: var(--c-text-on-brand);
  font-size: 28px;
  font-weight: bold;
  letter-spacing: -1px;
}
.wordmark--mark {
  display: inline-flex;
  align-items: center;
}
/* Kotak berinisial mengikuti lockup panel admin; ukuran dalam em mengikuti font-size induk. */
.wordmark__mark {
  display: grid;
  flex: none;
  width: 1.15em;
  height: 1.15em;
  place-items: center;
  border-radius: 0.3em;
  /* Putih transparan di atas biru merek, bukan warna mentah. */
  background: color-mix(in srgb, var(--c-text-on-brand) 24%, transparent);
  font-family: Georgia, serif;
  font-size: 0.85em;
  font-style: italic;
  font-weight: normal;
  letter-spacing: 0;
  line-height: 1;
}
</style>
