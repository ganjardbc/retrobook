<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@retrobook/shared/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { useRoute, useRouter } from 'vue-router'
import { safeAdminRedirect } from '@/core/router'
import { AdminApiError } from '@/modules/auth/services/api'
import { useAdminAuthStore } from '@/modules/auth/stores'

const auth = useAdminAuthStore()
const route = useRoute()
const router = useRouter()
const identifier = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.login(identifier.value.trim(), password.value)
    await router.replace(safeAdminRedirect(route.query.redirect))
  } catch (cause) {
    error.value =
      cause instanceof AdminApiError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : t('admin.login.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="brand-lockup">
        <span class="brand-mark">r</span><span>retrobook <small>ADMIN</small></span>
      </div>
      <LanguageSwitcher class="login-lang" />
      <p class="eyebrow">{{ t('admin.login.eyebrow') }}</p>
      <h1>{{ t('admin.login.title') }}</h1>
      <p class="login-copy">{{ t('admin.login.copy') }}</p>
      <form class="login-form" @submit.prevent="submit">
        <label for="identifier">{{ t('auth.login.identifier') }}</label>
        <input
          id="identifier"
          v-model="identifier"
          name="identifier"
          autocomplete="username"
          required
          autofocus
        />
        <div class="password-label">
          <label for="password">{{ t('auth.login.password') }}</label>
        </div>
        <input
          id="password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="button button--primary login-submit" type="submit" :disabled="busy">
          {{ busy ? t('admin.login.checking') : t('admin.login.submit') }}
          <span aria-hidden="true">→</span>
        </button>
      </form>
      <p class="login-foot">{{ t('admin.login.foot') }}</p>
    </section>
    <div class="login-aside">
      <div class="aside-orbit orbit-one" />
      <div class="aside-orbit orbit-two" />
      <div class="aside-content">
        <span class="eyebrow">RETROBOOK / MODERATION</span>
        <p>{{ t('admin.login.aside') }}</p>
        <span class="aside-caption">{{ t('admin.login.caption') }}</span>
      </div>
    </div>
  </main>
</template>
