<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import { useAuthStore } from '../stores/auth'

// Placeholder: layout tiga kolom dan feed menyusul di T-10 dan T-14.
const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="home">
    <h1>{{ t('home.welcome', { name: auth.user?.displayName ?? '' }) }}</h1>
    <p>{{ t('home.soon') }}</p>
    <button class="btn" type="button" @click="logout">{{ t('common.logOut') }}</button>
  </main>
  <AppFooter />
</template>

<style scoped>
.home {
  max-width: var(--w-page);
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4);
}
</style>
