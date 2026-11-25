<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
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
    <h1 class="page__title">{{ t('blocked.title') }}</h1>
    <p v-if="failed" class="form-error" role="alert">{{ t('blocked.error') }}</p>
    <section class="card">
      <ul v-if="users.length" class="list">
        <li v-for="u in users" :key="u.id" class="row">
          <Avatar :name="u.displayName" :src="u.avatarUrl" size="m" />
          <strong class="row__name">{{ u.displayName }}</strong>
          <Button variant="default" @click="unblock(u)">{{ t('blocked.unblock') }}</Button>
        </li>
      </ul>
      <p v-else-if="loading" class="note" role="status">{{ t('common.loading') }}</p>
      <p v-else class="note">{{ t('blocked.empty') }}</p>
    </section>
  </div>
</template>

<style scoped>
.page__title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fs-title);
}
.card {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--c-border-soft);
}
.row__name {
  flex: 1;
}
.note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
</style>
