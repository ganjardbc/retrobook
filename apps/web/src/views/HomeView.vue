<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { useAuthStore } from '../stores/auth'

// Placeholder: StatusBox dan feed menyusul di T-14.
const auth = useAuthStore()
</script>

<template>
  <section class="card">
    <h1>{{ t('home.welcome', { name: auth.user?.displayName ?? '' }) }}</h1>
    <p>{{ t('home.soon') }}</p>
  </section>
</template>

<style scoped>
.card {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.card h1 {
  margin: 0 0 var(--sp-2);
  font-size: var(--fs-title);
}
</style>
