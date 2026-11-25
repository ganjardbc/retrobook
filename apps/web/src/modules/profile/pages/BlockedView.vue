<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { blocksApi } from '@/modules/profile/services/blocks'

const users = ref<UserSummary[]>([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    users.value = (await blocksApi.list()).items
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function unblock(user: UserSummary) {
  failed.value = false
  try {
    await blocksApi.unblock(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch {
    failed.value = true
  }
}
onMounted(load)
</script>

<template>
  <div class="page">
    <p v-if="failed" class="form-error" role="alert">{{ t('blocked.error') }}</p>
    <PageCard :title="t('blocked.title')" flush>
      <ul v-if="users.length" class="list">
        <li v-for="u in users" :key="u.id" class="row">
          <Avatar :name="u.displayName" :src="u.avatarUrl" size="m" />
          <strong class="row__name">{{ u.displayName }}</strong>
          <Button variant="default" @click="unblock(u)">{{ t('blocked.unblock') }}</Button>
        </li>
      </ul>
      <LoadingRows v-else-if="loading" />
      <EmptyState
        v-else
        icon="mdi:account-cancel-outline"
        :title="t('blocked.empty')"
        :hint="t('blocked.emptyHint')"
      />
    </PageCard>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.row:first-child {
  border-top: 0;
}
.row__name {
  flex: 1;
}
</style>
