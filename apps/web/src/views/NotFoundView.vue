<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="nf">
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.body') }}</p>
    <RouterLink to="/">{{ t('notFound.home') }}</RouterLink>
  </main>
</template>

<style scoped>
.nf {
  max-width: 480px;
  margin: var(--sp-5) auto;
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
</style>
