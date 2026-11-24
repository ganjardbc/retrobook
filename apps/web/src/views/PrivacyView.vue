<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import WordMark from '../components/WordMark.vue'
</script>

<template>
  <div class="privacy-page">
    <header class="privacy-page__bar">
      <RouterLink to="/" aria-label="Retrobook home"><WordMark /></RouterLink>
    </header>
    <main class="privacy-page__content">
      <h1>{{ t('privacy.title') }}</h1>
      <p>{{ t('privacy.intro') }}</p>
      <h2>{{ t('privacy.data.title') }}</h2>
      <p>{{ t('privacy.data.body') }}</p>
      <h2>{{ t('privacy.security.title') }}</h2>
      <p>{{ t('privacy.security.body') }}</p>
      <RouterLink to="/">{{ t('privacy.home') }}</RouterLink>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.privacy-page__bar {
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-brand);
  border-bottom: 1px solid var(--c-brand-dark);
}
.privacy-page__bar a {
  display: block;
  width: fit-content;
  color: var(--c-text-on-brand);
  text-decoration: none;
}
.privacy-page__bar :deep(.wordmark) {
  font-size: 24px;
}
.privacy-page__content {
  width: min(calc(100% - 2 * var(--sp-4)), 640px);
  margin: var(--sp-5) auto;
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.privacy-page__content h1 {
  margin-top: 0;
  font-size: var(--fs-name);
}
.privacy-page__content h2 {
  margin-bottom: var(--sp-1);
  font-size: var(--fs-post);
}
.privacy-page__content p {
  color: var(--c-text-muted);
  line-height: 1.5;
}
</style>
