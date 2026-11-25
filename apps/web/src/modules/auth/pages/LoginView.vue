<script setup lang="ts">
import { t, type MessageKey } from '@retrobook/shared/i18n'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import AppFooter from '@/components/AppFooter.vue'
import Button from '@/components/Button.vue'
import WordMark from '@/components/WordMark.vue'
import { safeRedirect } from '@/core/global-routes'
import { useCountdown } from '@/composables/countdown'
import { useAuthStore } from '@/modules/auth/stores'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const identifier = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const wait = useCountdown()

const NOTICES = {
  expired: 'auth.login.reason.expired',
  ACCOUNT_SUSPENDED: 'auth.login.reason.ACCOUNT_SUSPENDED',
  ACCOUNT_BANNED: 'auth.login.reason.ACCOUNT_BANNED',
} as const satisfies Record<string, MessageKey>

const notice = computed(() => {
  const reason = route.query.reason
  return typeof reason === 'string' && reason in NOTICES
    ? t(NOTICES[reason as keyof typeof NOTICES])
    : ''
})

async function submit() {
  if (busy.value || wait.active.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.login(identifier.value, password.value)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 429) wait.start(e.retryAfter ?? 60)
    else error.value = e instanceof ApiRequestError ? e.messages.join(' ') : t('error.network')
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
        <form class="bar__form" @submit.prevent="submit">
          <label>
            <span>{{ t('auth.login.identifier') }}</span>
            <input v-model="identifier" name="identifier" autocomplete="username" required />
          </label>
          <label>
            <span>{{ t('auth.login.password') }}</span>
            <input
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <Button variant="default" type="submit" :disabled="busy || wait.active.value">{{
            t('auth.login.submit')
          }}</Button>
        </form>
      </div>
    </header>

    <main class="main">
      <p v-if="notice" class="form-error" role="status">{{ notice }}</p>
      <RouterLink class="forgot" to="/forgot-password">{{ t('auth.forgot.link') }}</RouterLink>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="wait.active.value" class="form-error" role="alert">
        {{ t('error.rateLimited', { n: wait.remaining.value }) }}
      </p>
      <div class="main__cols">
        <section class="tagline">
          <h1>{{ t('auth.login.tagline.title') }}</h1>
          <p>{{ t('auth.login.tagline.body') }}</p>
        </section>
        <section class="signup">
          <h2>{{ t('auth.login.signupTitle') }}</h2>
          <p>{{ t('auth.login.signupBody') }}</p>
          <Button variant="success" to="/register">{{ t('auth.login.signupCta') }}</Button>
        </section>
      </div>
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
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.bar__form {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.bar__form label {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  color: var(--c-text-on-brand);
  font-size: var(--fs-small);
}
.main {
  max-width: var(--w-page);
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4);
}
.main__cols {
  display: flex;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.tagline {
  flex: 1 1 360px;
}
.tagline h1 {
  font-size: 28px;
  line-height: 1.2;
  color: var(--c-brand);
}
.tagline p {
  font-size: var(--fs-title);
}
.signup {
  flex: 1 1 300px;
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
</style>
