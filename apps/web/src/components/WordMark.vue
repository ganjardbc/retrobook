<script setup lang="ts">
import { APP_NAME } from '@retrobook/shared'
</script>

<template>
  <span class="wordmark">
    <span class="wordmark__mark" aria-hidden="true">{{ APP_NAME.slice(0, 1) }}</span>
    <span class="wordmark__text">{{ APP_NAME }}</span>
  </span>
</template>

<style scoped>
/* Logo teks sementara (D-1), mengikuti lockup panel admin: kotak berinisial + nama.
   Semua ukuran dalam em: ukuran diatur oleh font-size induk (navbar, login, halaman legal). */
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  color: var(--c-text-on-brand);
  font-size: 28px;
  font-weight: bold;
  letter-spacing: -1px;
}
.wordmark__mark {
  display: grid;
  flex: none;
  width: 1.15em;
  height: 1.15em;
  place-items: center;
  border-radius: 0.3em;
  /* Putih transparan di atas biru merek: terbaca di navbar maupun header halaman tamu. */
  background: color-mix(in srgb, var(--c-text-on-brand) 24%, transparent);
  font-family: Georgia, serif;
  font-size: 0.85em;
  font-style: italic;
  font-weight: normal;
  letter-spacing: 0;
  line-height: 1;
}
</style>
