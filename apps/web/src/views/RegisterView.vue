<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiRequestError } from '../api/http'
import AppFooter from '../components/AppFooter.vue'
import Button from '../components/Button.vue'
import WordMark from '../components/WordMark.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ displayName: '', username: '', email: '', password: '' })
const busy = ref(false)
const errors = ref<string[]>([])

async function submit() {
  if (busy.value) return
  busy.value = true
  errors.value = []
  try {
    await auth.register({ ...form })
    await router.replace('/')
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
        <RouterLink class="bar__link" to="/login">{{ t('auth.register.haveAccount') }}</RouterLink>
      </div>
    </header>

    <main class="main">
      <form class="card" @submit.prevent="submit">
        <h1>{{ t('auth.register.title') }}</h1>
        <p class="muted">{{ t('auth.register.subtitle') }}</p>

        <div v-if="errors.length" class="form-error" role="alert">
          <div v-for="message in errors" :key="message">{{ message }}</div>
        </div>

        <label>
          <span>{{ t('auth.register.displayName') }}</span>
          <input
            v-model="form.displayName"
            name="displayName"
            autocomplete="name"
            maxlength="80"
            required
          />
        </label>
        <label>
          <span>{{ t('auth.register.username') }}</span>
          <input
            v-model="form.username"
            name="username"
            autocomplete="username"
            maxlength="30"
            required
          />
        </label>
        <label>
          <span>{{ t('auth.register.email') }}</span>
          <input v-model="form.email" name="email" type="email" autocomplete="email" required />
        </label>
        <label>
          <span>{{ t('auth.register.password') }}</span>
          <input
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </label>

        <Button variant="success" type="submit" :disabled="busy">{{
          t('auth.register.submit')
        }}</Button>
        <p class="parody">{{ t('auth.register.parody') }}</p>
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
