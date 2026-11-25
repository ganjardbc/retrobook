<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { useProfileStore } from '@/modules/profile/stores'

const store = useProfileStore()
const list = store.photos
const photoAlt = () => t('profile.photos.alt', { name: store.profile?.displayName ?? '' })

onMounted(() => void list.loadMore())
</script>

<template>
  <PageCard :title="t('profile.tab.photos')" heading="h2" flush>
    <template #title>
      <h2 class="pcard__title">
        <RouterLink :to="`/${store.profile?.username}/photos`">
          {{ t('profile.tab.photos') }}
        </RouterLink>
        <span class="photo-preview__count">{{ list.total }}</span>
      </h2>
    </template>
    <template #actions>
      <RouterLink :to="`/${store.profile?.username}/photos`">{{ t('profile.more') }}</RouterLink>
    </template>
    <ul v-if="list.items.length" class="photo-preview__grid">
      <li v-for="photo in list.items.slice(0, 9)" :key="photo.postId">
        <RouterLink :to="`/${store.profile?.username}/photos`" :aria-label="photoAlt()">
          <img :src="photo.url" :alt="photoAlt()" loading="lazy" />
        </RouterLink>
      </li>
    </ul>
    <LoadingRows v-else-if="list.loading" />
    <p v-else-if="list.failed" class="photo-preview__note" role="alert">
      {{ t('feed.error') }}
      <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
    </p>
    <p v-else class="photo-preview__note">{{ t('profile.photos.empty') }}</p>
  </PageCard>
</template>

<style scoped>
.pcard__title a {
  color: var(--c-brand);
  text-decoration: none;
}
.pcard__title {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: bold;
}
.photo-preview__count {
  margin-left: var(--sp-1);
  color: var(--c-text-muted);
  font-weight: normal;
}
.photo-preview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  margin: 0;
  padding: 2px;
  list-style: none;
}
.photo-preview__grid a,
.photo-preview__grid img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
}
.photo-preview__grid img {
  object-fit: cover;
}
.photo-preview__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
</style>
