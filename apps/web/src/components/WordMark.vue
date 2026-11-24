<script setup lang="ts">
import { APP_NAME } from '@retrobook/shared'
</script>

<template>
  <span class="wordmark">{{ APP_NAME }}</span>
</template>

<style scoped>
/* Wordmark teks sementara; logo belum ada (D-1). */
.wordmark {
  color: var(--c-text-on-brand);
  font-size: 28px;
  font-weight: bold;
  letter-spacing: -1px;
}
</style>
