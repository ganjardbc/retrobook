<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { meApi } from '@/modules/profile/services/me'
import { usersApi } from '@/modules/profile/services/api'
import Button from '@/components/Button.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'

const auth = useAuthStore()
const profiles = useProfileStore()
const router = useRouter()

const form = reactive({
  displayName: '',
  bio: '',
  hometown: '',
  currentCity: '',
  workplace: '',
  school: '',
  birthday: '',
})
const loading = ref(true)
const saving = ref(false)
const errors = ref<string[]>([])

onMounted(async () => {
  try {
    const p = await usersApi.profile(auth.user!.username)
    Object.assign(form, {
      displayName: p.displayName,
      bio: p.bio ?? '',
      hometown: p.hometown ?? '',
      currentCity: p.currentCity ?? '',
      workplace: p.workplace ?? '',
      school: p.school ?? '',
      birthday: p.birthday ?? '',
    })
  } catch (e) {
    errors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    loading.value = false
  }
})

async function save() {
  if (saving.value) return // Enter berulang tidak boleh mengirim ganda
  saving.value = true
  errors.value = []
  try {
    // Kolom kosong dikirim sebagai null supaya terhapus di server.
    const orNull = (v: string) => (v.trim() === '' ? null : v)
    const updated = await meApi.update({
      displayName: form.displayName,
      bio: orNull(form.bio),
      hometown: orNull(form.hometown),
      currentCity: orNull(form.currentCity),
      workplace: orNull(form.workplace),
      school: orNull(form.school),
      birthday: orNull(form.birthday),
    })
    auth.patchUser({ displayName: updated.displayName })
    profiles.reset() // profil dimuat ulang dengan data baru saat dibuka
    await router.push(`/${updated.username}`)
  } catch (e) {
    errors.value = e instanceof ApiRequestError ? e.messages : [t('error.network')]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="edit" @submit.prevent="save">
    <h1 class="edit__title">{{ t('edit.title') }}</h1>
    <p v-if="loading" role="status">{{ t('common.loading') }}</p>

    <template v-else>
      <div v-if="errors.length" class="form-error" role="alert">
        <div v-for="m in errors" :key="m">{{ m }}</div>
      </div>

      <label>
        <span>{{ t('edit.displayName') }}</span>
        <input v-model="form.displayName" name="displayName" maxlength="80" required />
      </label>
      <label>
        <span>{{ t('edit.bio') }}</span>
        <textarea v-model="form.bio" name="bio" rows="4" maxlength="2000" />
      </label>
      <label>
        <span>{{ t('edit.currentCity') }}</span>
        <input v-model="form.currentCity" name="currentCity" maxlength="80" />
      </label>
      <label>
        <span>{{ t('edit.hometown') }}</span>
        <input v-model="form.hometown" name="hometown" maxlength="80" />
      </label>
      <label>
        <span>{{ t('edit.workplace') }}</span>
        <input v-model="form.workplace" name="workplace" maxlength="120" />
      </label>
      <label>
        <span>{{ t('edit.school') }}</span>
        <input v-model="form.school" name="school" maxlength="120" />
      </label>
      <label>
        <span>{{ t('edit.birthday') }}</span>
        <input v-model="form.birthday" name="birthday" type="date" min="1900-01-01" />
      </label>

      <div class="edit__actions">
        <Button type="submit" :disabled="saving">{{
          saving ? t('edit.saving') : t('edit.save')
        }}</Button>
        <Button variant="default" :to="`/${auth.user?.username}`">{{ t('edit.cancel') }}</Button>
        <Button variant="default" to="/me/privacy">Privasi</Button>
      </div>
    </template>
  </form>
</template>

<style scoped>
.edit {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.edit__title {
  margin: 0;
  font-size: var(--fs-title);
}
.edit label {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.edit textarea {
  font: inherit;
  padding: var(--sp-2);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  resize: vertical;
}
.edit__actions {
  display: flex;
  gap: var(--sp-2);
}
</style>
