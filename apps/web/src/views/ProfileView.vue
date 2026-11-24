<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Button from '../components/Button.vue'
import FriendsGrid from '../components/FriendsGrid.vue'
import InfoCards from '../components/InfoCards.vue'
import ProfileHeader from '../components/ProfileHeader.vue'
import ProfileTabs from '../components/ProfileTabs.vue'
import { useProfileStore } from '../stores/profile'

const route = useRoute()
const store = useProfileStore()

function retry() {
  const name = String(route.params.username)
  store.reset()
  void store.load(name)
}

// Memuat saat username di URL berubah (termasuk dari profil satu ke profil lain).
watch(
  () => route.params.username,
  (u) => typeof u === 'string' && void store.load(u),
  { immediate: true },
)
</script>

<template>
  <div class="profile">
    <p v-if="store.state === 'loading'" class="profile__note" role="status">
      {{ t('common.loading') }}
    </p>
    <div v-else-if="store.state === 'unavailable'" class="profile__note">
      <h1 class="profile__title">{{ t('profile.unavailable') }}</h1>
    </div>
    <div v-else-if="store.state === 'error'" class="profile__note" role="alert">
      {{ t('profile.error') }}
      <Button variant="default" @click="retry">{{ t('feed.retry') }}</Button>
    </div>

    <template v-else-if="store.profile">
      <ProfileHeader :profile="store.profile" class="profile__header" />
      <ProfileTabs :profile="store.profile" />
      <div class="profile__body">
        <aside class="profile__info">
          <InfoCards :profile="store.profile" />
          <FriendsGrid :profile="store.profile" :friends="store.friends.items" />
        </aside>
        <section class="profile__main"><RouterView /></section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
}
.profile__header {
  margin-bottom: var(--sp-5);
}
.profile__note {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
  color: var(--c-text-muted);
  text-align: center;
}
.profile__title {
  margin: 0;
  font-size: var(--fs-title);
  color: var(--c-text);
}
.profile__body {
  display: grid;
  grid-template-columns: calc(var(--w-timeline) - var(--w-feed) - var(--sp-4)) minmax(0, 1fr);
  gap: var(--sp-4);
  margin-top: var(--sp-3);
}
.profile__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.profile__info,
.profile__main {
  min-width: 0;
}
@media (max-width: 900px) {
  .profile__body {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
