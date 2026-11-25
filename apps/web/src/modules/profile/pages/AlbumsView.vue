<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { albumsApi, type Album } from '../services/albums'

const albums = ref<Album[]>([])
const name = ref('')
const privacy = ref<Album['privacy']>('FRIENDS')
const error = ref('')
const loading = ref(false)
const saving = ref(false)
async function load() {
  loading.value = true
  try {
    albums.value = await albumsApi.list()
  } catch {
    error.value = 'Album gagal dimuat.'
  } finally {
    loading.value = false
  }
}
async function create() {
  error.value = ''
  const albumName = name.value.trim()
  if (!albumName) {
    error.value = 'Nama album wajib diisi.'
    return
  }
  saving.value = true
  try {
    const album = await albumsApi.create(albumName, privacy.value)
    albums.value.unshift(album)
    name.value = ''
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Album gagal dibuat.'
  } finally {
    saving.value = false
  }
}
onMounted(() => void load())
</script>

<template>
  <main class="albums">
    <h1>Album Foto</h1>
    <form class="albums__create" @submit.prevent="create">
      <label>Nama album <input v-model="name" maxlength="80" required /></label>
      <label
        >Privasi
        <select v-model="privacy">
          <option value="FRIENDS">Teman</option>
          <option value="PUBLIC">Publik</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      >
      <Button type="submit" :disabled="!name.trim() || saving">{{
        saving ? 'Menyimpan…' : 'Buat album'
      }}</Button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Memuat…</p>
    <ul class="albums__list">
      <li v-for="album in albums" :key="album.id">
        <RouterLink :to="`/albums/${album.id}`"
          ><img v-if="album.photos?.[0]" :src="album.photos[0].url" alt="" /><span>{{
            album.name
          }}</span
          ><small>{{ album._count?.photos ?? 0 }} foto</small></RouterLink
        >
      </li>
    </ul>
    <p v-if="!loading && !albums.length">Belum ada album.</p>
  </main>
</template>

<style scoped>
.albums {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h1 {
  margin-top: 0;
}
.albums__create {
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
.albums__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--sp-3);
  padding: 0;
  list-style: none;
}
.albums__list a {
  display: grid;
  gap: var(--sp-1);
  color: var(--c-text);
  text-decoration: none;
}
.albums__list img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--c-card-subtle);
}
small {
  color: var(--c-text-muted);
}
</style>
