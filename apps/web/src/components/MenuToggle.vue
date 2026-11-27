<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'

/** Tombol buka/tutup laci menu; ikonnya berganti menjadi X selama laci terbuka. */
defineProps<{ open?: boolean }>()
</script>

<template>
  <button type="button" :aria-label="t('nav.menu')" aria-controls="left-menu" :aria-expanded="open">
    <Icon :icon="open ? 'mdi:close' : 'mdi:menu'" aria-hidden="true" />
  </button>
</template>
