<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import AppFooter from '@/components/AppFooter.vue'
import Button from '@/components/Button.vue'
import WordMark from '@/components/WordMark.vue'
import { authApi } from '@/modules/auth/services/api'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const password = ref('')
const busy = ref(false)
const done = ref(false)
const errors = ref<string[]>(token ? [] : [t('auth.reset.invalid')])

async function submit() {
  if (busy.value || !token) return
  busy.value = true
  errors.value = []
  try {
    await authApi.resetPassword(token, password.value)
    done.value = true
  } catch (e) {
    errors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="bar">
      <div class="bar__inner">
        <WordMark />
        <RouterLink class="bar__link" to="/login">{{ t('auth.forgot.back') }}</RouterLink>
      </div>
    </header>
    <main class="main">
      <form class="card" @submit.prevent="submit">
        <h1>{{ t('auth.reset.title') }}</h1>
        <template v-if="done">
          <p class="muted" role="status">{{ t('auth.reset.done') }}</p>
          <RouterLink to="/login">{{ t('auth.forgot.back') }}</RouterLink>
        </template>
        <template v-else>
          <div v-if="errors.length" class="form-error" role="alert">
            <div v-for="message in errors" :key="message">{{ message }}</div>
          </div>
          <label>
            <span>{{ t('auth.reset.password') }}</span>
            <input
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </label>
          <Button variant="success" type="submit" :disabled="busy || !token">{{
            t('auth.reset.submit')
          }}</Button>
        </template>
      </form>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.bar {
  background: var(--c-brand);
  border-bottom: 1px solid var(--c-brand-dark);
}
.bar__inner {
  max-width: var(--w-page);
  margin: 0 auto;
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bar__link {
  color: var(--c-text-on-brand);
}
.main {
  max-width: 420px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4);
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.card h1 {
  margin: 0;
  font-size: var(--fs-name);
}
.card label {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.muted {
  margin: 0;
  color: var(--c-text-muted);
}
.parody {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-highlight);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  font-size: var(--fs-small);
}
</style>
