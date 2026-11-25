<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import Lightbox from '@/components/Lightbox.vue'
import PageCard from '@/components/PageCard.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { albumsApi, type Album } from '../services/albums'

const MAX_FILES = 10
const route = useRoute()
const router = useRouter()
const viewing = ref<number | null>(null)
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
async function removeAlbum() {
  if (!album.value || !window.confirm(t('album.delete.confirm'))) return
  try {
    await albumsApi.remove(album.value.id)
    await router.replace('/albums')
  } catch {
    error.value = t('album.deleteError')
  }
}
async function removePhoto(photoId: number) {
  if (!album.value || !window.confirm(t('album.photo.delete.confirm'))) return
  try {
    await albumsApi.removePhoto(album.value.id, photoId)
    await load()
  } catch {
    error.value = t('album.deleteError')
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
        <Button variant="default" @click="removeAlbum">{{ t('album.delete') }}</Button>
      </template>
    </template>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <ul v-if="album?.photos?.length" class="grid">
      <li v-for="(photo, i) in album.photos" :key="photo.id" class="cell">
        <button type="button" class="cell__open" @click="viewing = i">
          <img :src="photo.url" :alt="photo.caption || album.name" loading="lazy" />
        </button>
        <button
          v-if="isOwner()"
          type="button"
          class="cell__remove"
          :aria-label="t('album.photo.delete')"
          @click="removePhoto(photo.id)"
        >
          <Icon icon="mdi:close" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <Lightbox
      v-if="viewing !== null && album?.photos"
      :photos="album.photos.map((p) => ({ url: p.url, alt: p.caption || album!.name }))"
      :start="viewing"
      @close="viewing = null"
    />
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
.cell {
  position: relative;
}
.cell__open {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}
.cell__open img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid var(--c-border);
}
.cell__remove {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.6);
  color: var(--c-text-on-brand);
  cursor: pointer;
}
</style>
