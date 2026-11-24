<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
</script>

<template>
  <footer class="footer">
    <span>{{ t('footer.parody') }}</span>
  </footer>
</template>

<style scoped>
.footer {
  padding: var(--sp-4);
  text-align: center;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
</style>
