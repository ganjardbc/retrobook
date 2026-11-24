<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { useProfileStore } from '../stores/profile'
import { formatBirthday } from '../utils/birthday'

const store = useProfileStore()
const p = computed(() => store.profile)
const rows = computed(() => {
  const x = p.value
  if (!x) return []
  return [
    x.school && t('profile.info.studied', { v: x.school }),
    x.workplace && t('profile.info.works', { v: x.workplace }),
    x.currentCity && t('profile.info.lives', { v: x.currentCity }),
    x.hometown && t('profile.info.from', { v: x.hometown }),
    x.birthday && formatBirthday(x.birthday),
  ].filter((r): r is string => Boolean(r))
})
</script>

<template>
  <section v-if="p" class="about">
    <h2 class="about__title">{{ t('profile.about.title') }}</h2>
    <!-- Bio ditampilkan sebagai teks, tidak pernah HTML. -->
    <p v-if="p.bio" class="about__bio">{{ p.bio }}</p>
    <ul v-if="rows.length" class="about__list">
      <li v-for="r in rows" :key="r">{{ r }}</li>
    </ul>
    <p v-if="!p.bio && !rows.length" class="about__empty">{{ t('profile.about.empty') }}</p>
  </section>
</template>

<style scoped>
.about {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.about__title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fs-title);
}
.about__bio {
  margin: 0 0 var(--sp-3);
  font-size: var(--fs-post);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.about__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.about__list li {
  padding: var(--sp-2) 0;
  border-top: 1px solid var(--c-border-soft);
}
.about__empty {
  margin: 0;
  color: var(--c-text-muted);
}
</style>
