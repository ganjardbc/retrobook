<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
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
    error.value = e instanceof Error ? e.message : t('admin.words.loadError')
  }
}
async function add() {
  error.value = ''
  notice.value = ''
  try {
    const row = await adminBlockedWordsApi.add(input.value)
    notice.value = t('admin.words.added', {
      word: row.word,
      posts: row.flaggedPosts,
      comments: row.flaggedComments,
    })
    input.value = ''
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.words.addError')
  }
}
async function remove(word: BlockedWord) {
  error.value = ''
  notice.value = ''
  try {
    await adminBlockedWordsApi.remove(word.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.words.deleteError')
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.communitySafety') }}</p>
      <h1>{{ t('admin.nav.blockedWords') }}</h1>
      <p class="page-description">{{ t('admin.words.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="add">
      <label class="moderation-control"
        ><span>{{ t('admin.words.new') }}</span
        ><input v-model="input" minlength="2" maxlength="60" required /></label
      ><button class="button" type="submit">{{ t('admin.words.add') }}</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!words.length" class="reports-empty">{{ t('admin.words.empty') }}</p>
    <ul class="words-list">
      <li v-for="w in words" :key="w.id">
        <span>{{ w.word }}</span><button
          class="row-action row-action--delete"
          :aria-label="t('admin.words.remove', { word: w.word })"
          @click="remove(w)"
        >
          ×
        </button>
      </li>
    </ul>
  </section>
</template>
