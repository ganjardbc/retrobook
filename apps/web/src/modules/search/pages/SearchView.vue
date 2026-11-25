<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
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
  <PageCard :title="t('search.title')" flush>
    <EmptyState v-if="tooShort" icon="mdi:magnify" :title="t('search.tooShort')" />
    <ul v-else-if="results.items.value.length" class="list">
      <FriendRow v-for="u in results.items.value" :key="u.id" :user="u" />
    </ul>
    <LoadingRows v-else-if="results.loading.value" />
    <p v-else-if="results.failed.value" class="note" role="alert">
      {{ t('search.error') }}
      <Button variant="default" @click="results.loadMore()">{{ t('feed.retry') }}</Button>
    </p>
    <EmptyState
      v-else
      icon="mdi:account-search-outline"
      :title="t('search.noResults', { q })"
      :hint="t('search.emptyHint')"
    />
    <div v-if="results.items.value.length && !results.done.value" class="card__more">
      <Button variant="default" :disabled="results.loading.value" @click="results.loadMore()">{{
        t('search.loadMore')
      }}</Button>
    </div>
  </PageCard>
</template>

<style scoped>
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
