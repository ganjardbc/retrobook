<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import Button from '@/components/Button.vue'
import PageCard from '@/components/PageCard.vue'
import AuthLayout from '@/modules/auth/components/AuthLayout.vue'
</script>

<template>
  <AuthLayout>
    <div class="nf">
      <PageCard :title="t('maintenance.title')">
        <p class="nf__body">{{ t('maintenance.body') }}</p>
        <Button to="/">{{ t('maintenance.retry') }}</Button>
      </PageCard>
    </div>
  </AuthLayout>
</template>

<style scoped>
.nf {
  max-width: 480px;
  margin: var(--sp-5) auto;
  padding: 0 var(--sp-3);
}
.nf__body {
  margin: 0 0 var(--sp-3);
}
</style>
