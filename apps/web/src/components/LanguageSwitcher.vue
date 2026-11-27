<script setup lang="ts">
import { getLocale, LOCALE_NAMES, setLocale, t, type Locale } from '@retrobook/shared/i18n'

// Urutan tampil di footer: Bahasa Indonesia, English.
const ORDER: Locale[] = ['id', 'en']
</script>

<template>
  <span class="lang" role="group" :aria-label="t('footer.language')">
    <template v-for="(l, i) in ORDER" :key="l">
      <span v-if="i > 0" aria-hidden="true">·</span>
      <button
        type="button"
        class="lang__link"
        :lang="l"
        :aria-current="getLocale() === l ? 'true' : undefined"
        @click="setLocale(l)"
      >
        {{ LOCALE_NAMES[l] }}
      </button>
    </template>
  </span>
</template>

<style scoped>
.lang {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}
.lang__link {
  padding: 0;
  font: inherit;
  color: var(--c-link);
  background: none;
  border: 0;
  cursor: pointer;
}
.lang__link:hover {
  text-decoration: underline;
}
/* Bahasa aktif: tebal, bukan tautan. */
.lang__link[aria-current='true'] {
  color: inherit;
  font-weight: bold;
  cursor: default;
  text-decoration: none;
}
</style>
