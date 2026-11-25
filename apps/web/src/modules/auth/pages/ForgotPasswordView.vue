<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import Button from '@/components/Button.vue'
import { authApi } from '@/modules/auth/services/api'
import AuthLayout from '@/modules/auth/components/AuthLayout.vue'

const email = ref('')
const busy = ref(false)
const sent = ref(false)
const errors = ref<string[]>([])

async function submit() {
  if (busy.value) return
  busy.value = true
  errors.value = []
  try {
    await authApi.forgotPassword(email.value.trim())
    sent.value = true
  } catch (e) {
    errors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template #header>
      <RouterLink to="/login">{{ t('auth.forgot.back') }}</RouterLink>
    </template>
    <form class="card" @submit.prevent="submit">
      <h1>{{ t('auth.forgot.title') }}</h1>
      <p v-if="sent" class="muted" role="status">{{ t('auth.forgot.sent') }}</p>
      <template v-else>
        <p class="muted">{{ t('auth.forgot.body') }}</p>
        <div v-if="errors.length" class="form-error" role="alert">
          <div v-for="message in errors" :key="message">{{ message }}</div>
        </div>
        <label>
          <span>{{ t('auth.forgot.email') }}</span>
          <input v-model="email" name="email" type="email" autocomplete="email" required />
        </label>
        <Button variant="success" type="submit" :disabled="busy">{{ t('auth.forgot.submit') }}</Button>
      </template>
    </form>
  </AuthLayout>
</template>

<style scoped>
.card {
  width: min(420px, 100%);
  max-width: 420px;
  margin: var(--sp-5) auto;
  padding: var(--sp-5) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
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
