<script setup lang="ts">
import { getLocale, LOCALE_NAMES, LOCALES, setLocale, t, type Locale } from '@retrobook/shared/i18n'

const onChange = (e: Event) => setLocale((e.target as HTMLSelectElement).value as Locale)
</script>

<template>
  <label class="lang-switcher">
    <span class="sr-only">{{ t('admin.language') }}</span>
    <select :value="getLocale()" :aria-label="t('admin.language')" @change="onChange">
      <option v-for="l in LOCALES" :key="l" :value="l">{{ LOCALE_NAMES[l] }}</option>
    </select>
  </label>
</template>
