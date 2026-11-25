<script setup lang="ts">
import type { GroupSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import EntityRow from '@/components/EntityRow.vue'

const props = defineProps<{ group: GroupSummary; compact?: boolean; showPrivacy?: boolean }>()
const meta = computed(() => {
  const n = props.group.memberCount
  const members = t(n === 1 ? 'groups.members.one' : 'groups.members', { count: n })
  return props.showPrivacy ? `${members} · ${t(`groups.privacy.${props.group.privacy}`)}` : members
})
</script>

<template>
  <EntityRow
    :name="group.name"
    :to="`/groups/${group.id}`"
    :meta="meta"
    :description="compact ? undefined : group.description"
    :compact="compact"
  >
    <slot />
  </EntityRow>
</template>
