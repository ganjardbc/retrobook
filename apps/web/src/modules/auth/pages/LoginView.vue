<script setup lang="ts">
import { Icon } from '@iconify/vue'
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

// ikon dan warna mengikuti LeftMenu supaya konsisten di dalam app
const FEATURES = [
  { key: 'timeline', icon: 'mdi:chart-timeline-variant', tone: 'blue' },
  { key: 'chat', icon: 'mdi:message-text-outline', tone: 'green' },
  { key: 'poke', icon: 'mdi:hand-pointing-right', tone: 'orange' },
  { key: 'privacy', icon: 'mdi:account-lock-outline', tone: 'red' },
] as const

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
      <div class="bar">
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
            <RouterLink class="forgot" to="/forgot-password">{{
              t('auth.forgot.link')
            }}</RouterLink>
          </div>
          <Button
            class="bar__submit"
            variant="default"
            type="submit"
            :disabled="busy || wait.active.value"
            >{{ t('auth.login.submit') }}</Button
          >
        </form>
        <div v-if="notice || error || wait.active.value" class="bar__alert">
          <p v-if="notice" role="status">{{ notice }}</p>
          <p v-if="error" role="alert">{{ error }}</p>
          <p v-if="wait.active.value" role="alert">
            {{ t('error.rateLimited', { n: wait.remaining.value }) }}
          </p>
        </div>
      </div>
    </template>

    <div class="main">
      <div class="main__cols">
        <section class="tagline">
          <h1>{{ t('auth.login.tagline.title') }}</h1>
          <p>{{ t('auth.login.tagline.body') }}</p>
          <ul class="features">
            <li v-for="f in FEATURES" :key="f.key" class="feature">
              <span class="feature__icon" :class="`feature__icon--${f.tone}`" aria-hidden="true"
                ><Icon :icon="f.icon"
              /></span>
              <div>
                <strong>{{ t(`auth.login.feature.${f.key}.title`) }}</strong>
                <span>{{ t(`auth.login.feature.${f.key}.body`) }}</span>
              </div>
            </li>
          </ul>
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
.bar {
  position: relative;
}
.bar__alert {
  position: absolute;
  z-index: 10;
  top: calc(100% + 10px);
  right: 0;
  width: min(340px, 100vw - 2 * var(--auth-gutter));
  padding: 9px 12px;
  border: 1px solid var(--c-danger);
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 3px 10px rgb(0 0 0 / 22%);
  color: var(--c-danger);
  font-size: 13px;
  line-height: 1.4;
}
.bar__alert p {
  margin: 0;
}
.bar__alert p + p {
  margin-top: 4px;
}
.bar__alert::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 40px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--c-danger);
  border-left: 1px solid var(--c-danger);
  background: #fff;
  transform: rotate(45deg);
}
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
  width: min(var(--auth-container), 100%);
  margin: 0 auto;
  padding: 56px var(--auth-gutter) 64px;
  flex: 1;
}
.main__cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 480px);
  align-items: start;
  gap: clamp(48px, 6vw, 96px);
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
.features {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 28px;
  max-width: 600px;
  margin: 40px 0 0;
  padding: 28px 0 0;
  border-top: 1px solid #d9dee7;
  list-style: none;
}
.feature {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.feature__icon {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: var(--c-text-on-brand);
  font-size: 22px;
  box-shadow: inset 0 -2px 0 rgb(0 0 0 / 14%);
}
.feature__icon--blue {
  background: var(--c-icon-blue);
}
.feature__icon--green {
  background: var(--c-icon-green);
}
.feature__icon--orange {
  background: var(--c-icon-orange);
}
.feature__icon--red {
  background: var(--c-icon-red);
}
.feature strong {
  display: block;
  margin-bottom: 3px;
  color: #30343b;
  font-size: 16px;
}
.feature div span {
  color: #59616e;
  font-size: 14px;
  line-height: 1.45;
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
  .bar {
    width: 100%;
  }
  .bar__alert {
    right: auto;
    left: 0;
  }
  .bar__alert::before {
    right: auto;
    left: 24px;
  }
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
    padding: 28px var(--auth-gutter) 44px;
  }
  .main__cols {
    grid-template-columns: 1fr;
    gap: 34px;
  }
  .signup__form h2 {
    font-size: 32px;
  }
  .signup__fields,
  .features {
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
