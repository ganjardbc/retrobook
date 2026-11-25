<script setup lang="ts">
import { t, type MessageKey } from '@retrobook/shared/i18n'
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import Button from '@/components/Button.vue'
import { safeRedirect } from '@/core/global-routes'
import { useCountdown } from '@/composables/countdown'
import { useAuthStore } from '@/modules/auth/stores'
import AuthLayout from '@/modules/auth/components/AuthLayout.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const identifier = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const wait = useCountdown()
const signup = reactive({ displayName: '', username: '', email: '', password: '' })
const signupBusy = ref(false)
const signupErrors = ref<string[]>([])
const signupWait = useCountdown()

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

async function submitSignup() {
  if (signupBusy.value || signupWait.active.value) return
  signupBusy.value = true
  signupErrors.value = []
  try {
    await auth.register({ ...signup })
    await router.replace('/')
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 429) signupWait.start(e.retryAfter ?? 60)
    else signupErrors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    signupBusy.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template #header>
      <form class="bar__form" @submit.prevent="submit">
        <label for="login-identifier">
          <span>{{ t('auth.login.identifier') }}</span>
          <input
            id="login-identifier"
            v-model="identifier"
            name="identifier"
            autocomplete="username"
            required
          />
        </label>
        <div class="password-field">
          <label for="login-password">{{ t('auth.login.password') }}</label>
          <input
            id="login-password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <RouterLink class="forgot" to="/forgot-password">{{ t('auth.forgot.link') }}</RouterLink>
        </div>
        <Button
          class="bar__submit"
          variant="default"
          type="submit"
          :disabled="busy || wait.active.value"
          >{{ t('auth.login.submit') }}</Button
        >
      </form>
    </template>

    <div class="main">
      <p v-if="notice" class="form-error" role="status">{{ notice }}</p>
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
          <form class="signup__form" @submit.prevent="submitSignup">
            <h2>{{ t('auth.register.title') }}</h2>
            <p>{{ t('auth.register.subtitle') }}</p>
            <div v-if="signupWait.active.value" class="form-error" role="alert">
              {{ t('error.rateLimited', { n: signupWait.remaining.value }) }}
            </div>
            <div v-if="signupErrors.length" class="form-error" role="alert">
              <div v-for="message in signupErrors" :key="message">{{ message }}</div>
            </div>
            <div class="signup__fields">
              <label>
                <span>{{ t('auth.register.displayName') }}</span>
                <input
                  v-model="signup.displayName"
                  name="displayName"
                  autocomplete="name"
                  maxlength="80"
                  required
                />
              </label>
              <label>
                <span>{{ t('auth.register.username') }}</span>
                <input
                  v-model="signup.username"
                  name="username"
                  autocomplete="username"
                  maxlength="30"
                  required
                />
              </label>
              <label class="signup__wide">
                <span>{{ t('auth.register.email') }}</span>
                <input
                  v-model="signup.email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                />
              </label>
              <label class="signup__wide">
                <span>{{ t('auth.register.password') }}</span>
                <input
                  v-model="signup.password"
                  name="new-password"
                  type="password"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
              </label>
            </div>
            <Button
              variant="success"
              type="submit"
              :disabled="signupBusy || signupWait.active.value"
            >
              {{ t('auth.register.submit') }}
            </Button>
            <p class="signup__parody">{{ t('auth.register.parody') }}</p>
          </form>
        </section>
      </div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.bar__form {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.bar__form > label,
.password-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #f5f7fb;
  font-size: 13px;
  font-weight: 600;
}
.password-field {
  gap: 5px;
}
.password-field label {
  display: block;
}
.bar__form input {
  width: 188px;
  height: 32px;
  padding: 5px 8px;
  border: 1px solid #233f72;
  border-radius: 0;
  background: #fff;
  color: #262b33;
  box-shadow: inset 0 1px 1px rgb(0 0 0 / 12%);
  font-size: 14px;
}
.bar__form input:focus-visible {
  outline: 2px solid #c8d7f1;
  outline-offset: 1px;
}
.forgot {
  color: #c6d3eb;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
}
.forgot:hover {
  color: #fff;
}
.bar__form :deep(.btn) {
  min-height: 32px;
  margin-top: 21px;
  padding: 0 12px;
  border-color: #203e73;
  border-radius: 2px;
  background: #5b78ad;
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 1px 1px rgb(0 0 0 / 16%);
  font-size: 14px;
}
.bar__form :deep(.btn:hover:not(:disabled)) {
  background: #6985b9;
}
.main {
  width: min(1160px, 100%);
  margin: 0 auto;
  padding: 52px 28px 64px;
  flex: 1;
}
.main__cols {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(330px, 0.88fr);
  align-items: start;
  gap: clamp(52px, 8vw, 112px);
}
.tagline {
  padding-top: 38px;
}
.tagline h1 {
  max-width: 580px;
  margin: 0 0 18px;
  color: #30343b;
  font-size: clamp(30px, 3.2vw, 40px);
  font-weight: 700;
  letter-spacing: -0.8px;
  line-height: 1.18;
}
.tagline p {
  max-width: 560px;
  margin: 0;
  color: #59616e;
  font-size: 21px;
  line-height: 1.5;
}
.signup {
  min-width: 0;
}
.signup__form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.signup__form h2 {
  margin: 0 0 8px;
  color: #30343b;
  font-size: 38px;
  letter-spacing: -1px;
  line-height: 1.15;
}
.signup__form > p {
  margin: 0 0 25px;
  color: #555e6c;
  font-size: 20px;
  line-height: 1.4;
}
.signup__fields {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.signup__fields label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #59616e;
  font-size: 13px;
  font-weight: 600;
}
.signup__fields input {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 7px 10px;
  border: 1px solid #c3cad5;
  border-radius: 5px;
  background: #fff;
  color: #30343b;
  font-size: 15px;
}
.signup__fields input:focus-visible {
  outline: 2px solid #8da8d5;
  outline-offset: 1px;
}
.signup__wide {
  grid-column: 1 / -1;
}
.signup :deep(.btn) {
  min-width: 220px;
  min-height: 46px;
  padding: 0 22px;
  border-color: #3e7a32;
  border-radius: 5px;
  background: linear-gradient(#70b85b, #4a9638);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 28%),
    0 1px 2px rgb(0 0 0 / 12%);
  font-size: 18px;
  text-shadow: 0 1px 1px rgb(0 0 0 / 18%);
}
.signup :deep(.btn:hover:not(:disabled)) {
  background: linear-gradient(#7bc365, #4f9d3c);
}
.signup__parody {
  max-width: 480px;
  margin: 0;
  color: var(--login-muted);
  font-size: 12px;
  line-height: 1.45;
}
@media (max-width: 760px) {
  .bar__form {
    width: 100%;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }
  .bar__form > label,
  .password-field {
    flex: 1 1 180px;
  }
  .bar__form input {
    width: 100%;
  }
  .bar__form :deep(.btn) {
    margin-top: 0;
  }
  .main {
    padding: 28px 20px 44px;
  }
  .main__cols {
    grid-template-columns: 1fr;
    gap: 34px;
  }
  .tagline {
    padding-top: 6px;
  }
  .signup__form h2 {
    font-size: 32px;
  }
  .signup__fields {
    grid-template-columns: 1fr;
  }
  .signup__wide {
    grid-column: auto;
  }
}
@media (max-width: 420px) {
  .bar__form {
    align-items: stretch;
  }
  .bar__form > label,
  .password-field {
    flex-basis: 100%;
  }
  .bar__form :deep(.btn) {
    align-self: flex-start;
  }
}
</style>
