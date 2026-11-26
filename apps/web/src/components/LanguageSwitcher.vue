<script setup lang="ts">
import { getLocale, LOCALE_NAMES, LOCALES, setLocale, t, type Locale } from '@retrobook/shared/i18n'

const onChange = (e: Event) => setLocale((e.target as HTMLSelectElement).value as Locale)
</script>

<template>
  <label class="lang">
    <span class="lang__label">{{ t('footer.language') }}</span>
    <select class="lang__select" :value="getLocale()" @change="onChange">
      <option v-for="l in LOCALES" :key="l" :value="l">{{ LOCALE_NAMES[l] }}</option>
    </select>
  </label>
</template>

<style scoped>
.lang {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}
.lang__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.lang__select {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}
</style>
