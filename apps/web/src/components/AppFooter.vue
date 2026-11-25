<script setup lang="ts">
import { APP_NAME } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="footer">
    <span class="footer__links">
      <span>{{ t('footer.language') }}</span>
      <span aria-hidden="true">·</span>
      <RouterLink to="/privacy">{{ t('footer.privacy') }}</RouterLink>
    </span>
    <span>{{ t('footer.parody') }}</span>
    <span>{{ APP_NAME }} © 2015</span>
  </footer>
</template>

<style scoped>
.footer__links {
  display: inline-flex;
  gap: var(--sp-1);
}
.footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: var(--sp-4);
  text-align: center;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
</style>
