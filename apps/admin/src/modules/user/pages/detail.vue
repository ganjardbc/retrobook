<script setup lang="ts">
import { intlLocale, t } from '@retrobook/shared/i18n'
import { computed, onMounted, ref } from 'vue'
import { isUuid } from '@retrobook/shared'
import { useRoute, useRouter } from 'vue-router'
import { AdminApiError } from '@/modules/auth/services/api'
import { adminUsersApi } from '@/modules/user/services/api'
import { useUserStore } from '@/modules/user/stores'
import type { UserRole, UserStatus } from '@/modules/user/services/types'

const route = useRoute()
const router = useRouter()
const users = useUserStore()
const id = String(route.params.id)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const temporaryPassword = ref('')
const user = computed(() => users.currentUser)
onMounted(() => {
  if (isUuid(id)) void users.fetchDetail(id)
  else void router.replace('/users')
})
function friendly(errorValue: unknown) {
  if (errorValue instanceof AdminApiError)
    return /LAST_ADMIN|admin terakhir|last admin/i.test(errorValue.message)
      ? t('admin.detail.lastAdmin')
      : errorValue.message
  return t('admin.detail.actionFailed')
}
async function changeStatus(status: UserStatus) {
  if (!user.value || busy.value) return
  const reason = window.prompt(t(`admin.detail.reason.${status}`))?.trim()
  if (!reason) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await adminUsersApi.updateStatus(id, status, reason)
    notice.value = t('admin.detail.statusUpdated')
    await users.fetchDetail(id)
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function changeRole(event: Event) {
  if (!user.value || busy.value) return
  const role = (event.target as HTMLSelectElement).value as UserRole
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await adminUsersApi.updateRole(id, role)
    notice.value = t('admin.detail.roleUpdated')
    await users.fetchDetail(id)
  } catch (e) {
    error.value = friendly(e)
    await users.fetchDetail(id)
  } finally {
    busy.value = false
  }
}
async function resetPassword() {
  if (
    !user.value ||
    busy.value ||
    !window.confirm(t('admin.detail.confirmReset', { username: user.value.username }))
  )
    return
  busy.value = true
  error.value = ''
  temporaryPassword.value = ''
  notice.value = ''
  try {
    const result = await adminUsersApi.resetPassword(id)
    temporaryPassword.value = result.temporaryPassword
    notice.value = t('admin.detail.resetDone', { count: result.revokedSessions })
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function removeUser() {
  if (
    !user.value ||
    busy.value ||
    !window.confirm(t('admin.detail.confirmDelete', { username: user.value.username }))
  )
    return
  const typed = window.prompt(t('admin.detail.typeUsername', { username: user.value.username }))
  if (typed !== user.value.username) {
    if (typed !== null) error.value = t('admin.detail.usernameMismatch')
    return
  }
  busy.value = true
  error.value = ''
  try {
    await adminUsersApi.remove(id)
    await router.push('/users')
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function copyPassword() {
  await navigator.clipboard.writeText(temporaryPassword.value)
  notice.value = t('admin.detail.copied')
}
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })
    : t('admin.detail.neverActive')
}
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.users.eyebrow') }}</p>
      <h1>{{ t('admin.detail.title') }}</h1>
      <p class="page-description">{{ t('admin.detail.description') }}</p>
    </div>
    <button class="button button--quiet" @click="router.push('/users')">
      {{ t('admin.detail.back') }}
    </button>
  </div>
  <div v-if="users.detailLoading" class="surface-card detail-loading">
    <span class="loader" /> {{ t('admin.detail.loading') }}
  </div>
  <div v-else-if="users.detailError" class="surface-card detail-loading">
    <p class="form-error">{{ users.detailError }}</p>
    <button class="button button--quiet" @click="users.fetchDetail(id)">
      {{ t('admin.common.retry') }}
    </button>
  </div>
  <template v-else-if="user">
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <section class="surface-card user-profile-card">
      <div class="detail-identity">
        <span class="detail-avatar">{{ user.displayName.slice(0, 1).toUpperCase() }}</span>
        <div>
          <p class="eyebrow">{{ t('admin.detail.profile') }}</p>
          <h2>{{ user.displayName }} <span v-if="user.isBot" class="bot-tag">BOT</span></h2>
          <p>@{{ user.username }} · {{ user.email }}</p>
        </div>
      </div>
      <div class="detail-badges">
        <span class="user-pill" :class="`user-pill--${user.role.toLowerCase()}`">{{
          t(`admin.user.role.${user.role}`)
        }}</span><span class="user-status" :class="`user-status--${user.status.toLowerCase()}`"
          ><i />{{ t(`admin.user.status.${user.status}`) }}</span
        >
      </div>
    </section>
    <section class="detail-grid">
      <article class="surface-card detail-card">
        <p class="eyebrow">{{ t('admin.detail.activity') }}</p>
        <h2>{{ t('admin.detail.summary') }}</h2>
        <dl class="detail-stats">
          <div>
            <dt>{{ t('admin.detail.posts') }}</dt>
            <dd>{{ user.postCount }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.detail.comments') }}</dt>
            <dd>{{ user.commentCount }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.detail.reports') }}</dt>
            <dd>{{ user.reportCount }}</dd>
          </div>
        </dl>
        <dl class="detail-meta">
          <div>
            <dt>{{ t('auth.register.email') }}</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.users.col.joined') }}</dt>
            <dd>{{ date(user.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ t('admin.detail.lastSeen') }}</dt>
            <dd>{{ date(user.lastSeenAt) }}</dd>
          </div>
        </dl>
      </article>
      <article class="surface-card detail-card">
        <p class="eyebrow">{{ t('admin.detail.manage') }}</p>
        <h2>{{ t('admin.detail.actions') }}</h2>
        <label class="detail-label"
          >{{ t('admin.detail.role')
          }}<select :value="user.role" :disabled="busy" @change="changeRole">
            <option value="USER">{{ t('admin.user.role.USER') }}</option>
            <option value="ADMIN">{{ t('admin.user.role.ADMIN') }}</option>
          </select></label
        >
        <div class="action-stack">
          <button
            class="button button--quiet"
            :disabled="busy"
            @click="changeStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')"
          >
            {{
              user.status === 'ACTIVE' ? t('admin.detail.suspend') : t('admin.detail.activate')
            }}</button><button
            v-if="user.status !== 'BANNED'"
            class="button button--warning"
            :disabled="busy"
            @click="changeStatus('BANNED')"
          >
            {{ t('admin.detail.ban') }}</button
          ><button class="button button--quiet" :disabled="busy" @click="resetPassword">
            {{ t('admin.detail.resetPassword') }}</button
          ><button class="button button--danger" :disabled="busy" @click="removeUser">
            {{ t('admin.detail.deleteAccount') }}
          </button>
        </div>
      </article>
    </section>
    <section v-if="temporaryPassword" class="surface-card password-reveal">
      <div>
        <p class="eyebrow">{{ t('admin.detail.tempPassword') }}</p>
        <strong>{{ temporaryPassword }}</strong>
        <p>{{ t('admin.detail.tempPasswordNote') }}</p>
      </div>
      <button class="button button--primary" @click="copyPassword">
        {{ t('admin.detail.copy') }}
      </button>
    </section>
  </template>
</template>
