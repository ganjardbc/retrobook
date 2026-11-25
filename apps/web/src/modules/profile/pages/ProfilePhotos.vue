<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import { useProfileStore } from '@/modules/profile/stores'
import { useAuthStore } from '@/modules/auth/stores'
import { albumsApi, type Album } from '@/modules/profile/services/albums'

const store = useProfileStore()
const list = store.photos
const auth = useAuthStore()
const albums = ref<Album[]>([])

onMounted(() => void list.loadMore())
watch(
  () => store.profile?.username,
  (owner) => {
    if (owner) void albumsApi.forProfile(owner).then((items) => (albums.value = items))
  },
  { immediate: true },
)
</script>

<template>
  <section class="photos" :aria-label="t('profile.tab.photos')">
    <h2 class="photos__head">{{ t('profile.tab.photos') }}</h2>
    <div
      v-if="
        albums.length || auth.user?.username.toLowerCase() === store.profile?.username.toLowerCase()
      "
      class="photos__albums"
    >
      <h3>Album foto</h3>
      <ul class="photos__album-grid">
        <li v-for="album in albums" :key="album.id">
          <RouterLink :to="`/albums/${album.id}`">
            <img v-if="album.photos?.[0]" :src="album.photos[0].url" alt="" />
            <span>{{ album.name }}</span>
          </RouterLink>
        </li>
      </ul>
      <RouterLink
        v-if="auth.user?.username.toLowerCase() === store.profile?.username.toLowerCase()"
        to="/albums"
        >Kelola album</RouterLink
      >
    </div>
    <ul v-if="list.items.length" class="photos__grid">
      <li v-for="p in list.items" :key="p.postId">
        <a :href="p.url" target="_blank" rel="noopener noreferrer" class="photos__link">
          <img
            :src="p.url"
            :alt="t('profile.photos.alt', { name: store.profile?.displayName ?? '' })"
            loading="lazy"
          />
        </a>
      </li>
    </ul>
    <p v-else-if="list.loading" class="photos__note" role="status">{{ t('common.loading') }}</p>
    <p v-else-if="list.failed" class="photos__note" role="alert">
      {{ t('feed.error') }}
      <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
    </p>
    <p v-else class="photos__note">{{ t('profile.photos.empty') }}</p>
    <div v-if="list.items.length && !list.done" class="photos__more">
      <Button variant="default" :disabled="list.loading" @click="list.loadMore()">{{
        t('profile.more')
      }}</Button>
    </div>
  </section>
</template>

<style scoped>
.photos {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.photos__head {
  margin: 0;
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-post);
}
.photos__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin: 0;
  padding: 2px;
  list-style: none;
}
.photos__link {
  display: block;
  aspect-ratio: 1;
}
.photos__link img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photos__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.photos__more {
  padding: var(--sp-3);
  text-align: center;
}
.photos__albums {
  padding: var(--sp-3);
  border-bottom: 1px solid var(--c-border-soft);
}
.photos__album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--sp-2);
  padding: 0;
  list-style: none;
}
.photos__album-grid a {
  display: grid;
  gap: var(--sp-1);
  color: var(--c-text);
  text-decoration: none;
}
.photos__album-grid img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--c-card-subtle);
}
</style>
