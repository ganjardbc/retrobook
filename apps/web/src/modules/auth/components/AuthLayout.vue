<script setup lang="ts">
import AppFooter from '@/components/AppFooter.vue'
import WordMark from '@/components/WordMark.vue'
</script>

<template>
  <div class="auth-layout">
    <header class="auth-layout__header">
      <div class="auth-layout__header-inner">
        <WordMark />
        <div class="auth-layout__header-actions"><slot name="header" /></div>
      </div>
    </header>
    <main class="auth-layout__main"><slot /></main>
    <AppFooter />
  </div>
</template>

<style scoped>
.auth-layout {
  --login-blue: #3b5998;
  --login-blue-deep: #29487d;
  --login-ground: #edf0f5;
  --login-ink: #30343b;
  --login-muted: #737d8c;
  /* lebar dan gutter bersama: header dan konten halaman harus sejajar */
  --auth-container: 1120px;
  --auth-gutter: 32px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--login-ground);
  color: var(--login-ink);
}
.auth-layout__header {
  background: var(--login-blue);
  border-bottom: 1px solid var(--login-blue-deep);
  box-shadow: 0 1px 2px rgb(20 39 74 / 18%);
}
.auth-layout__header-inner {
  width: min(var(--auth-container), 100%);
  min-height: 90px;
  margin: 0 auto;
  padding: 14px var(--auth-gutter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}
.auth-layout__header :deep(.wordmark) {
  font-size: clamp(34px, 3.4vw, 46px);
  letter-spacing: -2.5px;
  line-height: 1;
  text-shadow: 0 1px 0 rgb(0 0 0 / 12%);
}
.auth-layout__header-actions :deep(a) {
  color: #d3def0;
  font-size: 14px;
}
.auth-layout__header-actions :deep(a:hover) {
  color: #fff;
}
.auth-layout__main {
  width: 100%;
  flex: 1;
}
.auth-layout :deep(.footer) {
  margin-top: auto;
  border-top: 1px solid #d9dee7;
}
@media (max-width: 760px) {
  .auth-layout {
    --auth-gutter: 20px;
  }
  .auth-layout__header-inner {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 18px var(--auth-gutter) 20px;
  }
}
</style>
