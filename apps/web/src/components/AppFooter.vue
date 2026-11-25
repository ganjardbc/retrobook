<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
</script>

<template>
  <footer class="footer">
    <span>{{ t('footer.parody') }}</span>
    <RouterLink to="/privacy">{{ t('footer.privacy') }}</RouterLink>
    <ThemeSwitcher />
  </footer>
</template>

<style scoped>
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
