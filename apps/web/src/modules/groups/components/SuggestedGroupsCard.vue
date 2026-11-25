<script setup lang="ts">
import type { GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
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
import GroupRow from '@/modules/groups/components/GroupRow.vue'
</script>

<template>
  <PageCard
    v-if="groups.length"
    class="sgroups"
    quiet
    :title="t('suggestedGroups.title')"
    heading="h2"
    flush
  >
    <ul class="list">
      <GroupRow v-for="g in groups" :key="g.id" compact :group="g">
        <Button class="join" variant="default" :disabled="busy === g.id" @click="join(g)">
          <Icon icon="mdi:plus" aria-hidden="true" />{{ t('groups.join') }}
        </Button>
      </GroupRow>
    </ul>
  </PageCard>
</template>

<style scoped>
.sgroups {
  margin-bottom: var(--sp-3);
}
.list {
  margin: 0;
  padding: var(--sp-1) 0;
  list-style: none;
}
/* Tombol sekunder abu terang bergaya 2015, sama dengan kartu People You May Know. */
.join {
  min-height: 22px;
  gap: var(--sp-1);
  padding: 0 var(--sp-2);
  font-size: var(--fs-small);
}
</style>
