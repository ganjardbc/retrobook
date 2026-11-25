<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageCard from '@/components/PageCard.vue'
import { formatBirthday } from '@/modules/profile/helpers/birthday'

const props = defineProps<{ profile: Profile }>()

// Hanya baris yang terisi yang ditampilkan (PRF-04).
const rows = computed(() => {
  const p = props.profile
  const out: { key: string; icon: string; text: string }[] = []
  if (p.school)
    out.push({
      key: 'school',
      icon: 'mdi:school-outline',
      text: t('profile.info.studied', { v: p.school }),
    })
  if (p.workplace)
    out.push({
      key: 'work',
      icon: 'mdi:briefcase-outline',
      text: t('profile.info.works', { v: p.workplace }),
    })
  if (p.currentCity)
    out.push({
      key: 'lives',
      icon: 'mdi:home-city-outline',
      text: t('profile.info.lives', { v: p.currentCity }),
    })
  if (p.hometown)
    out.push({
      key: 'from',
      icon: 'mdi:map-marker-outline',
      text: t('profile.info.from', { v: p.hometown }),
    })
  if (p.birthday)
    out.push({ key: 'born', icon: 'mdi:cake-variant-outline', text: formatBirthday(p.birthday) })
  return out
})
const isSelf = computed(() => props.profile.relationship === 'SELF')
const isPrivate = computed(() => props.profile.profileInfoVisible === false)
// Kartu tampil bila ada isinya; di profil sendiri selalu, supaya ada ajakan mengisi.
const visible = computed(
  () => isSelf.value || (!isPrivate.value && (rows.value.length > 0 || !!props.profile.bio)),
)
defineExpose({ rows })
</script>

<template>
  <PageCard v-if="visible" :title="t('profile.about.title')" heading="h2">
    <template v-if="isSelf" #actions>
      <RouterLink to="/me/edit">{{ t('profile.about.add') }}</RouterLink>
    </template>
    <!-- Bio ditampilkan sebagai teks, tidak pernah HTML. -->
    <p v-if="profile.bio && !isPrivate" class="info__bio">{{ profile.bio }}</p>
    <ul v-if="rows.length" class="info__list">
      <li v-for="row in rows" :key="row.key" class="info__row">
        <Icon :icon="row.icon" class="info__icon" aria-hidden="true" />
        <span>{{ row.text }}</span>
      </li>
    </ul>
    <p v-else-if="isSelf || isPrivate" class="info__empty">
      {{ isPrivate ? t('profile.about.private') : t('profile.about.empty') }}
    </p>
  </PageCard>
</template>

<style scoped>
.info__bio {
  margin: 0 0 var(--sp-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.info__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.info__row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  overflow-wrap: anywhere;
}
.info__icon {
  flex: none;
  margin-top: 1px;
  color: var(--c-text-muted);
  font-size: 16px;
}
.info__empty {
  margin: 0;
  color: var(--c-text-muted);
}
</style>
