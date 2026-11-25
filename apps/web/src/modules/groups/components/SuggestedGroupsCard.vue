<script setup lang="ts">
import type { GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import { groupsApi } from '@/modules/groups/services/api'

const groups = ref<GroupSummary[]>([])
const busy = ref<number | null>(null)

onMounted(async () => {
  try {
    groups.value = (await groupsApi.list()).suggested.slice(0, 3)
  } catch {
    groups.value = []
  }
})

async function join(group: GroupSummary) {
  busy.value = group.id
  try {
    await groupsApi.join(group.id)
    groups.value = groups.value.filter((g) => g.id !== group.id)
  } catch {
    // Gagal gabung: biarkan tombol tetap ada supaya bisa dicoba lagi.
  } finally {
    busy.value = null
  }
}
import PageCard from '@/components/PageCard.vue'
</script>

<template>
  <PageCard
    v-if="groups.length"
    class="sgroups"
    :title="t('suggestedGroups.title')"
    heading="h2"
    flush
  >
    <ul class="list">
      <li v-for="g in groups" :key="g.id" class="item">
        <span class="item__text">
          <RouterLink class="item__name" :to="`/groups/${g.id}`">{{ g.name }}</RouterLink>
          <small>{{ t('groups.members', { count: g.memberCount }) }}</small>
        </span>
        <Button :disabled="busy === g.id" @click="join(g)">{{ t('groups.join') }}</Button>
      </li>
    </ul>
  </PageCard>
</template>

<style scoped>
.sgroups {
  margin-bottom: var(--sp-3);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.item__name {
  font-weight: bold;
  overflow-wrap: anywhere;
}
.item__text small {
  color: var(--c-text-muted);
}
</style>
