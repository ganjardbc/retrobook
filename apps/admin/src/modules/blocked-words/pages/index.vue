<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminBlockedWordsApi, type BlockedWord } from '@/modules/blocked-words/services/api'

const words = ref<BlockedWord[]>([])
const input = ref('')
const error = ref('')
const notice = ref('')
async function load() {
  try {
    words.value = (await adminBlockedWordsApi.list()).items
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat daftar.'
  }
}
async function add() {
  error.value = ''
  notice.value = ''
  try {
    const row = await adminBlockedWordsApi.add(input.value)
    notice.value = `"${row.word}" ditambahkan; ${row.flaggedPosts} post dan ${row.flaggedComments} komentar lama ditandai.`
    input.value = ''
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menambah kata.'
  }
}
async function remove(word: BlockedWord) {
  error.value = ''
  notice.value = ''
  try {
    await adminBlockedWordsApi.remove(word.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal menghapus kata.'
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KEAMANAN KOMUNITAS</p>
      <h1>Kata terlarang</h1>
      <p class="page-description">
        Konten yang memuat kata ini tetap terbit, tetapi ditandai dan muncul di filter "Kata
        terlarang" pada Moderasi.
      </p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="add">
      <label class="moderation-control"
        ><span>Kata baru</span
        ><input v-model="input" minlength="2" maxlength="60" required /></label
      ><button class="button" type="submit">Tambah</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!words.length" class="reports-empty">Belum ada kata terlarang.</p>
    <ul class="words-list">
      <li v-for="w in words" :key="w.id">
        <span>{{ w.word }}</span><button
          class="row-action row-action--delete"
          :aria-label="`Hapus ${w.word}`"
          @click="remove(w)"
        >
          ×
        </button>
      </li>
    </ul>
  </section>
</template>
