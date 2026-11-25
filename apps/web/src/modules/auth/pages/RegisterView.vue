<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import Button from '@/components/Button.vue'
import { useCountdown } from '@/composables/countdown'
import { useAuthStore } from '@/modules/auth/stores'
import AuthLayout from '@/modules/auth/components/AuthLayout.vue'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ displayName: '', username: '', email: '', password: '' })
const busy = ref(false)
const errors = ref<string[]>([])
const wait = useCountdown()

async function submit() {
  if (busy.value || wait.active.value) return
  busy.value = true
  errors.value = []
  try {
    await auth.register({ ...form })
    await router.replace('/')
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 429) wait.start(e.retryAfter ?? 60)
    else errors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template #header>
      <RouterLink to="/login">{{ t('auth.register.haveAccount') }}</RouterLink>
    </template>
    <div class="main">
      <form class="card" @submit.prevent="submit">
        <h1>{{ t('auth.register.title') }}</h1>
        <p class="muted">{{ t('auth.register.subtitle') }}</p>

        <div v-if="wait.active.value" class="form-error" role="alert">
          {{ t('error.rateLimited', { n: wait.remaining.value }) }}
        </div>
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

        <Button variant="success" type="submit" :disabled="busy || wait.active.value">{{
          t('auth.register.submit')
        }}</Button>
        <p class="parody">{{ t('auth.register.parody') }}</p>
      </form>
    </div>
  </AuthLayout>
</template>

<style scoped>
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
