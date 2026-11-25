<script setup lang="ts">
import type { GroupPrivacy, GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import PageCard from '@/components/PageCard.vue'
import { ApiRequestError } from '@/plugins/http'
import { RouterLink } from 'vue-router'
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
    <PageCard :title="t('groups.mine')">
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
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <LoadingRows v-if="loading" />
      <ul v-if="groups.length" class="list">
        <li v-for="group in groups" :key="group.id" class="item">
          <Avatar :name="group.name" size="m" />
          <div class="item__main">
            <RouterLink class="item__name" :to="`/groups/${group.id}`">{{ group.name }}</RouterLink>
            <span class="item__meta"
              >{{ t('groups.members', { count: group.memberCount }) }} ·
              {{ t(`groups.privacy.${group.privacy}`) }}</span
            >
            <span v-if="group.description" class="item__desc">{{ group.description }}</span>
          </div>
        </li>
      </ul>
      <EmptyState
        v-else-if="!loading"
        icon="mdi:account-group-outline"
        :title="t('groups.empty')"
        :hint="t('groups.emptyHint')"
      />
    </PageCard>

    <PageCard v-if="suggested.length" :title="t('groups.discover')">
      <ul class="list">
        <li v-for="group in suggested" :key="group.id" class="item">
          <Avatar :name="group.name" size="m" />
          <div class="item__main">
            <RouterLink class="item__name" :to="`/groups/${group.id}`">{{ group.name }}</RouterLink>
            <span class="item__meta">{{ t('groups.members', { count: group.memberCount }) }}</span>
            <span v-if="group.description" class="item__desc">{{ group.description }}</span>
          </div>
          <Button @click="join(group)">{{ t('groups.join') }}</Button>
        </li>
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
  margin-bottom: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
}
.form__actions {
  display: flex;
  gap: var(--sp-2);
  padding-left: 118px;
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item:first-child {
  padding-top: 0;
}
.item__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.item__name {
  font-weight: bold;
  overflow-wrap: anywhere;
}
.item__meta,
.item__desc {
  color: var(--c-text-muted);
}
.item__desc {
  overflow-wrap: anywhere;
}
@media (max-width: 560px) {
  .form__actions {
    padding-left: 0;
  }
}
</style>
