<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import { albumsApi, type Album } from '../services/albums'

const route = useRoute()
const album = ref<Album | null>(null)
const files = ref<File[]>([])
const error = ref('')
async function load() {
  try {
    album.value = await albumsApi.get(Number(route.params.id))
  } catch {
    error.value = 'Album tidak ditemukan.'
  }
}
async function upload() {
  if (!album.value || !files.value.length) return
  try {
    await albumsApi.addPhotos(album.value.id, files.value)
    files.value = []
    await load()
  } catch {
    error.value = 'Foto gagal diunggah.'
  }
}
onMounted(() => void load())
</script>

<template>
  <main class="album">
    <h1>{{ album?.name ?? 'Album' }}</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <form v-if="album" class="album__upload" @submit.prevent="upload">
      <label
        >Tambah foto
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="files = Array.from(($event.target as HTMLInputElement).files ?? [])" /></label
      ><Button type="submit" :disabled="!files.length">Unggah hingga 10 foto</Button>
    </form>
    <ul v-if="album?.photos?.length" class="album__grid">
      <li v-for="photo in album.photos" :key="photo.id">
        <a :href="photo.url" target="_blank" rel="noopener noreferrer"
          ><img :src="photo.url" :alt="photo.caption || album.name"
        /></a>
      </li>
    </ul>
    <p v-else-if="album">Album ini belum memiliki foto.</p>
  </main>
</template>

<style scoped>
.album {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.album__upload {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
}
label {
  display: grid;
  gap: 4px;
}
.album__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--sp-2);
  padding: 0;
  list-style: none;
}
.album__grid img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
</style>
