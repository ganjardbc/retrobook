<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiRequestError } from '@/plugins/http'
import { meApi } from '@/modules/profile/services/me'
import { usersApi } from '@/modules/profile/services/api'
import Button from '@/components/Button.vue'
import FormRow from '@/components/FormRow.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
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
  <PageCard :title="t('edit.title')">
    <template #actions>
      <RouterLink to="/me/privacy">{{ t('edit.privacy') }}</RouterLink>
    </template>
    <LoadingRows v-if="loading" :rows="4" />
    <form v-else class="edit" @submit.prevent="save">
      <div v-if="errors.length" class="form-error" role="alert">
        <div v-for="m in errors" :key="m">{{ m }}</div>
      </div>

      <FormRow :label="t('edit.displayName')" for-id="ed-name">
        <input id="ed-name" v-model="form.displayName" name="displayName" maxlength="80" required />
      </FormRow>
      <FormRow :label="t('edit.bio')" for-id="ed-bio">
        <textarea id="ed-bio" v-model="form.bio" name="bio" rows="4" maxlength="2000" />
      </FormRow>
      <FormRow :label="t('edit.currentCity')" for-id="ed-city">
        <input id="ed-city" v-model="form.currentCity" name="currentCity" maxlength="80" />
      </FormRow>
      <FormRow :label="t('edit.hometown')" for-id="ed-home">
        <input id="ed-home" v-model="form.hometown" name="hometown" maxlength="80" />
      </FormRow>
      <FormRow :label="t('edit.workplace')" for-id="ed-work">
        <input id="ed-work" v-model="form.workplace" name="workplace" maxlength="120" />
      </FormRow>
      <FormRow :label="t('edit.school')" for-id="ed-school">
        <input id="ed-school" v-model="form.school" name="school" maxlength="120" />
      </FormRow>
      <FormRow :label="t('edit.birthday')" for-id="ed-bday">
        <input id="ed-bday" v-model="form.birthday" name="birthday" type="date" min="1900-01-01" />
      </FormRow>

      <div class="edit__actions">
        <Button type="submit" :disabled="saving">{{
          saving ? t('edit.saving') : t('edit.save')
        }}</Button>
        <Button variant="default" :to="`/${auth.user?.username}`">{{ t('edit.cancel') }}</Button>
      </div>
    </form>
  </PageCard>
</template>

<style scoped>
.edit {
  display: grid;
  gap: var(--sp-3);
}
.edit__actions {
  display: flex;
  gap: var(--sp-2);
  padding-left: 118px;
}
@media (max-width: 560px) {
  .edit__actions {
    padding-left: 0;
  }
}
</style>
