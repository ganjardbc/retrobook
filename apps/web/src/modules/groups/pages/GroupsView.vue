<script setup lang="ts">
import type { GroupPrivacy, GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import PageCard from '@/components/PageCard.vue'
import { ApiRequestError } from '@/plugins/http'
import GroupRow from '../components/GroupRow.vue'
import { groupsApi } from '../services/api'

const privacyOptions: IconOption[] = [
  { value: 'PUBLIC', label: t('groups.privacy.PUBLIC'), icon: 'mdi:earth' },
  { value: 'CLOSED', label: t('groups.privacy.CLOSED'), icon: 'mdi:lock' },
]
const groups = ref<GroupSummary[]>([])
const suggested = ref<GroupSummary[]>([])
const showForm = ref(false)
const name = ref('')
const description = ref('')
const privacy = ref<GroupPrivacy>('PUBLIC')
const error = ref('')
const saving = ref(false)
const loading = ref(true)

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

async function load() {
  try {
    const data = await groupsApi.list()
    groups.value = data.items
    suggested.value = data.suggested
  } catch (cause) {
    error.value = message(cause, t('groups.loadError'))
  } finally {
    loading.value = false
  }
}
function closeForm() {
  showForm.value = false
  name.value = description.value = ''
}
async function create() {
  error.value = ''
  if (!name.value.trim()) return
  saving.value = true
  try {
    groups.value.unshift(
      await groupsApi.create({
        name: name.value.trim(),
        description: description.value.trim(),
        privacy: privacy.value,
      }),
    )
    closeForm()
  } catch (cause) {
    error.value = message(cause, t('groups.createError'))
  } finally {
    saving.value = false
  }
}
async function join(group: GroupSummary) {
  try {
    groups.value.unshift(await groupsApi.join(group.id))
    suggested.value = suggested.value.filter((item) => item.id !== group.id)
  } catch (cause) {
    error.value = message(cause, t('groups.joinError'))
  }
}
onMounted(() => void load())
</script>

<template>
  <div class="groups">
    <PageCard :title="t('groups.mine')" flush>
      <template #actions>
        <Button v-if="!showForm" @click="showForm = true">{{ t('groups.create') }}</Button>
      </template>
      <form v-if="showForm" class="form" @submit.prevent="create">
        <FormRow :label="t('groups.name')" for-id="grp-name">
          <input id="grp-name" v-model="name" maxlength="80" required />
        </FormRow>
        <FormRow :label="t('groups.description')" for-id="grp-desc">
          <textarea id="grp-desc" v-model="description" maxlength="2000" rows="2" />
        </FormRow>
        <FormRow :label="t('groups.privacy')">
          <IconSelect v-model="privacy" :options="privacyOptions" :label="t('groups.privacy')" />
        </FormRow>
        <div class="form__actions">
          <Button type="submit" :disabled="saving || !name.trim()">{{ t('groups.save') }}</Button>
          <Button variant="default" @click="closeForm">{{ t('page.cancel') }}</Button>
        </div>
      </form>
      <p v-if="error" class="form-error groups__error" role="alert">{{ error }}</p>
      <LoadingRows v-if="loading" />
      <ul v-if="groups.length" class="list">
        <GroupRow v-for="group in groups" :key="group.id" :group="group" show-privacy />
      </ul>
      <EmptyState
        v-else-if="!loading"
        icon="mdi:account-group-outline"
        :title="t('groups.empty')"
        :hint="t('groups.emptyHint')"
      />
    </PageCard>

    <PageCard v-if="suggested.length" :title="t('groups.discover')" flush>
      <ul class="list">
        <GroupRow v-for="group in suggested" :key="group.id" :group="group">
          <Button @click="join(group)">{{ t('groups.join') }}</Button>
        </GroupRow>
      </ul>
    </PageCard>
  </div>
</template>

<style scoped>
.groups {
  display: grid;
  gap: var(--sp-3);
}
.form {
  display: grid;
  gap: var(--sp-2);
  margin: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
}
.form__actions {
  display: flex;
  gap: var(--sp-2);
  padding-left: 118px;
}
.groups__error {
  margin: var(--sp-3);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
@media (max-width: 560px) {
  .form__actions {
    padding-left: 0;
  }
}
</style>
