<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import Button from '@/components/Button.vue'
import PageCard from '@/components/PageCard.vue'
import AuthLayout from '@/modules/auth/components/AuthLayout.vue'
</script>

<template>
  <AuthLayout>
    <div class="nf">
      <PageCard :title="t('notFound.title')">
        <p class="nf__code" aria-hidden="true">{{ t('notFound.code') }}</p>
        <p class="nf__body">{{ t('notFound.body') }}</p>
        <Button to="/">{{ t('notFound.home') }}</Button>
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
.nf__code {
  margin: 0;
  color: var(--c-border);
  font-size: 56px;
  font-weight: bold;
  line-height: 1;
}
.nf__body {
  margin: var(--sp-2) 0 var(--sp-3);
}
</style>
