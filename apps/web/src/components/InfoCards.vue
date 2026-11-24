<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { formatBirthday } from '../utils/birthday'

const props = defineProps<{ profile: Profile }>()

// Hanya baris yang terisi yang ditampilkan (PRF-04).
const rows = computed(() => {
  const p = props.profile
  const out: { key: string; text: string }[] = []
  if (p.school) out.push({ key: 'school', text: t('profile.info.studied', { v: p.school }) })
  if (p.workplace) out.push({ key: 'work', text: t('profile.info.works', { v: p.workplace }) })
  if (p.currentCity) out.push({ key: 'lives', text: t('profile.info.lives', { v: p.currentCity }) })
  if (p.hometown) out.push({ key: 'from', text: t('profile.info.from', { v: p.hometown }) })
  if (p.birthday) out.push({ key: 'born', text: formatBirthday(p.birthday) })
  return out
})
defineExpose({ rows })
</script>

<template>
  <section v-if="rows.length" class="info" :aria-label="t('profile.about.title')">
    <ul class="info__list">
      <li v-for="row in rows" :key="row.key" class="info__row">{{ row.text }}</li>
    </ul>
  </section>
</template>

<style scoped>
.info {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.info__list {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  list-style: none;
}
.info__row {
  padding: var(--sp-2) 0;
  overflow-wrap: anywhere;
}
</style>
