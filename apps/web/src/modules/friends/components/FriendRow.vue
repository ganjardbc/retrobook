<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'

/**
 * `compact` untuk kartu kolom samping: avatar kecil, nama satu baris, keterangan dan aksi
 * sejajar di bawahnya. Slot `corner` untuk tombol tutup yang muncul saat hover atau fokus.
 */
defineProps<{ user: UserSummary; meta?: string; compact?: boolean }>()
</script>

<template>
  <li class="row" :class="{ 'row--compact': compact }">
    <Avatar :name="user.displayName" :src="user.avatarUrl" :size="compact ? 's' : 'm'" />
    <div class="row__who">
      <RouterLink class="row__name" :to="`/${user.username}`">{{ user.displayName }}</RouterLink>
      <div v-if="compact" class="row__line">
        <span v-if="meta" class="row__meta">{{ meta }}</span>
        <slot />
      </div>
      <div v-else-if="meta" class="row__meta">{{ meta }}</div>
    </div>
    <div v-if="!compact" class="row__actions"><slot /></div>
    <div v-if="$slots.corner" class="row__corner"><slot name="corner" /></div>
  </li>
</template>

<style scoped>
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.row:first-child {
  border-top: 0;
}
.row__who {
  flex: 1;
  min-width: 0;
}
.row__name {
  font-weight: bold;
}
.row__meta {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.row__actions {
  display: flex;
  gap: var(--sp-2);
}
.row--compact {
  align-items: flex-start;
  gap: var(--sp-2);
  border-top: 0;
}
.row--compact .row__name {
  display: block;
  padding-right: var(--sp-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1) var(--sp-2);
}
.row__corner {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-2);
  opacity: 0;
}
.row:hover .row__corner,
.row:focus-within .row__corner {
  opacity: 1;
}
/* Layar sentuh tidak punya hover: tombol di sudut selalu terlihat. */
@media (hover: none) {
  .row__corner {
    opacity: 1;
  }
}
</style>
