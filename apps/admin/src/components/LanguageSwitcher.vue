<script setup lang="ts">
import { computed } from 'vue'
import { getLocale, LOCALE_NAMES, setLocale, t, type Locale } from '@retrobook/shared/i18n'

// Hanya dua bahasa: tombol menukar ke bahasa lainnya.
const next = computed<Locale>(() => (getLocale() === 'id' ? 'en' : 'id'))
const label = computed(() => `${t('admin.language')}: ${LOCALE_NAMES[next.value]}`)
</script>

<template>
  <button
    type="button"
    class="lang-switcher"
    :title="label"
    :aria-label="label"
    @click="setLocale(next)"
  >
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"
      />
    </svg>
    <span class="lang-switcher__code">{{ getLocale().toUpperCase() }}</span>
  </button>
</template>
