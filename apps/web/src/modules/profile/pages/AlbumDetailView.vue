<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageCard from '@/components/PageCard.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { albumsApi, type Album } from '../services/albums'

const MAX_FILES = 10
const route = useRoute()
const auth = useAuthStore()
const album = ref<Album | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')

async function load() {
  try {
    album.value = await albumsApi.get(Number(route.params.id))
  } catch {
    error.value = t('album.notFound')
  }
}
async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).slice(0, MAX_FILES)
  input.value = ''
  if (!album.value || !files.length) return
  error.value = ''
  uploading.value = true
  try {
    await albumsApi.addPhotos(album.value.id, files)
    await load()
  } catch {
    error.value = t('album.uploadError')
  } finally {
    uploading.value = false
  }
}
// Hanya pemilik yang bisa mengunggah (server menegakkan; ini hanya menyembunyikan tombol).
const isOwner = () => album.value !== null && album.value.ownerId === auth.user?.id
onMounted(() => void load())
</script>

<template>
  <PageCard :title="album?.name ?? t('album.fallbackTitle')">
    <template #actions>
      <RouterLink to="/albums">{{ t('album.back') }}</RouterLink>
      <template v-if="album && isOwner()">
        <input
          ref="fileInput"
          class="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="onFiles"
        />
        <Button :disabled="uploading" @click="fileInput?.click()">{{
          uploading ? t('album.uploading') : t('album.add')
        }}</Button>
      </template>
    </template>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <ul v-if="album?.photos?.length" class="grid">
      <li v-for="photo in album.photos" :key="photo.id">
        <a :href="photo.url" target="_blank" rel="noopener noreferrer"
          ><img :src="photo.url" :alt="photo.caption || album.name"
        /></a>
      </li>
    </ul>
    <EmptyState
      v-else-if="album"
      icon="mdi:image-plus-outline"
      :title="t('album.empty')"
      :hint="isOwner() ? t('album.emptyHint') : undefined"
    />
  </PageCard>
</template>

<style scoped>
.file {
  display: none;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.grid img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid var(--c-border);
}
</style>
