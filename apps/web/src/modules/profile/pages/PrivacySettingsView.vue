<script setup lang="ts">
import { PRIVACIES } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/Button.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { PRIVACY_ICONS } from '@/helpers/privacy'
import { ApiRequestError } from '@/plugins/http'
import { meApi, type PrivacySettings } from '@/modules/profile/services/me'
import { useAuthStore } from '@/modules/auth/stores'

const options = computed<IconOption[]>(() =>
  PRIVACIES.map((p) => ({
    value: p,
    label: t(p === 'PUBLIC' ? 'privacySettings.option.PUBLIC' : `privacy.${p}`),
    icon: PRIVACY_ICONS[p],
  })),
)
const settings = reactive<PrivacySettings>({
  profileInfoPrivacy: 'PUBLIC',
  friendsPrivacy: 'PUBLIC',
  defaultPostPrivacy: 'FRIENDS',
})
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()
const fail = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

onMounted(async () => {
  try {
    Object.assign(settings, await meApi.privacy())
  } catch (cause) {
    error.value = fail(cause, t('privacySettings.loadError'))
  } finally {
    loading.value = false
  }
})
async function save() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    Object.assign(settings, await meApi.updatePrivacy({ ...settings }))
    message.value = t('privacySettings.saved')
  } catch (cause) {
    error.value = fail(cause, t('privacySettings.saveError'))
  } finally {
    saving.value = false
  }
}
async function deleteAccount() {
  error.value = ''
  message.value = ''
  if (!window.confirm(t('account.delete.confirm'))) return
  try {
    await meApi.deleteAccount(password.value)
    auth.clear()
    await router.replace('/login')
  } catch (cause) {
    error.value = fail(cause, t('account.delete.error'))
  }
}
</script>

<template>
  <div class="privacy">
    <PageCard :title="t('privacySettings.title')">
      <LoadingRows v-if="loading" :rows="3" />
      <form v-else class="form" @submit.prevent="save">
        <FormRow :label="t('privacySettings.profileInfo')">
          <IconSelect
            v-model="settings.profileInfoPrivacy"
            :options="options"
            :label="t('privacySettings.profileInfo')"
          />
        </FormRow>
        <FormRow :label="t('privacySettings.friends')">
          <IconSelect
            v-model="settings.friendsPrivacy"
            :options="options"
            :label="t('privacySettings.friends')"
          />
        </FormRow>
        <FormRow :label="t('privacySettings.defaultPost')">
          <IconSelect
            v-model="settings.defaultPostPrivacy"
            :options="options"
            :label="t('privacySettings.defaultPost')"
          />
        </FormRow>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="message" class="ok" role="status">{{ message }}</p>
        <div class="form__actions">
          <Button type="submit" :disabled="saving">{{ t('privacySettings.save') }}</Button>
        </div>
      </form>
    </PageCard>

    <PageCard :title="t('account.delete.title')" heading="h2">
      <form class="form" @submit.prevent="deleteAccount">
        <p class="hint">{{ t('account.delete.hint') }}</p>
        <FormRow :label="t('account.delete.password')" for-id="del-pass">
          <input
            id="del-pass"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </FormRow>
        <div class="form__actions">
          <Button type="submit" :disabled="!password">{{ t('account.delete.button') }}</Button>
        </div>
      </form>
    </PageCard>
  </div>
</template>

<style scoped>
.privacy {
  display: grid;
  gap: var(--sp-3);
}
.form {
  display: grid;
  gap: var(--sp-3);
}
.form__actions {
  padding-left: 118px;
}
.hint,
.ok {
  margin: 0;
  color: var(--c-text-muted);
}
.ok {
  padding-left: 118px;
  color: var(--c-text);
}
@media (max-width: 560px) {
  .form__actions,
  .ok {
    padding-left: 0;
  }
}
</style>
