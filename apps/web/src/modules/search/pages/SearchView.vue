<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import { usePaged } from '@/composables/paged'
import FriendRow from '@/modules/friends/components/FriendRow.vue'
import { MIN_QUERY, searchApi } from '@/modules/search/services/api'

const route = useRoute()
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
const tooShort = computed(() => q.value.length < MIN_QUERY)

// Kata kunci yang dipakai tiap permintaan dibekukan supaya halaman berikutnya tidak tercampur.
const results = usePaged(
  (cursor) => searchApi.people(q.value, cursor, 10),
  (u) => u.id,
)
watch(
  q,
  () => {
    results.reset()
    if (!tooShort.value) void results.loadMore()
  },
  { immediate: true },
)
</script>

<template>
  <div class="search">
    <h1 class="search__title">{{ t('search.title') }}</h1>
    <section class="card" :aria-label="t('search.title')">
      <p v-if="tooShort" class="note">{{ t('search.tooShort') }}</p>
      <ul v-else-if="results.items.value.length" class="list">
        <FriendRow v-for="u in results.items.value" :key="u.id" :user="u" />
      </ul>
      <p v-else-if="results.loading.value" class="note" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="results.failed.value" class="note" role="alert">
        {{ t('search.error') }}
        <Button variant="default" @click="results.loadMore()">{{ t('feed.retry') }}</Button>
      </p>
      <p v-else class="note">{{ t('search.noResults', { q }) }}</p>
      <div v-if="results.items.value.length && !results.done.value" class="card__more">
        <Button variant="default" :disabled="results.loading.value" @click="results.loadMore()">{{
          t('search.loadMore')
        }}</Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.search__title {
  margin: 0;
  font-size: var(--fs-title);
}
.card {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.card__more {
  padding: var(--sp-3);
  text-align: center;
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
</style>
