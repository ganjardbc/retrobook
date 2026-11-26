<script setup lang="ts">
import type { GroupPrivacy, GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { ApiRequestError } from '@/plugins/http'
import { groupsApi } from '../services/api'

const privacyOptions = computed<IconOption[]>(() => [
  { value: 'PUBLIC', label: t('groups.privacy.PUBLIC'), icon: 'mdi:earth' },
  { value: 'CLOSED', label: t('groups.privacy.CLOSED'), icon: 'mdi:lock' },
])
const route = useRoute()
const router = useRouter()
const id = String(route.params.id)
const group = ref<GroupSummary | null>(null)
const name = ref('')
const description = ref('')
const privacy = ref<GroupPrivacy>('PUBLIC')
const error = ref('')
const loading = ref(true)
const saving = ref(false)

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

onMounted(async () => {
  try {
    const g = await groupsApi.get(id)
    // Hanya admin yang boleh mengedit; selain itu kembali ke halaman grup.
    if (!g.isAdmin) return void router.replace(`/groups/${id}`)
    group.value = g
    name.value = g.name
    description.value = g.description
    privacy.value = g.privacy
  } catch (cause) {
    error.value = message(cause, t('groups.notFound'))
  } finally {
    loading.value = false
  }
})

async function onPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  try {
    group.value = await groupsApi.uploadPhoto(id, file)
  } catch (cause) {
    error.value = message(cause, t('groups.photoError'))
  }
}
async function save() {
  if (!name.value.trim() || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await groupsApi.update(id, {
      name: name.value.trim(),
      description: description.value.trim(),
      privacy: privacy.value,
    })
    await router.push(`/groups/${id}`)
  } catch (cause) {
    error.value = message(cause, t('groups.editError'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageCard :title="t('groups.edit')">
    <template #actions>
      <RouterLink :to="`/groups/${id}`">{{ t('groups.back') }}</RouterLink>
    </template>
    <LoadingRows v-if="loading" :rows="3" />
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <form v-if="group" class="form" @submit.prevent="save">
      <FormRow :label="t('groups.photo')" for-id="grp-photo">
        <div class="photo">
          <Avatar :name="group.name" :src="group.avatarUrl" size="l" />
          <input
            id="grp-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :aria-label="t('groups.photo.change')"
            @change="onPhoto"
          />
        </div>
      </FormRow>
      <FormRow :label="t('groups.name')" for-id="grp-name">
        <input id="grp-name" v-model="name" maxlength="80" required />
      </FormRow>
      <FormRow :label="t('groups.description')" for-id="grp-desc">
        <textarea id="grp-desc" v-model="description" maxlength="2000" rows="4" />
      </FormRow>
      <FormRow :label="t('groups.privacy')">
        <IconSelect v-model="privacy" :options="privacyOptions" :label="t('groups.privacy')" />
      </FormRow>
      <div class="form__actions">
        <Button type="submit" :disabled="saving || !name.trim()">{{ t('edit.save') }}</Button>
        <Button variant="default" @click="router.push(`/groups/${id}`)">{{
          t('page.cancel')
        }}</Button>
      </div>
    </form>
  </PageCard>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--sp-2);
}
.photo {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.form__actions {
  display: flex;
  gap: var(--sp-2);
  padding-left: 118px;
}
@media (max-width: 560px) {
  .form__actions {
    padding-left: 0;
  }
}
</style>
