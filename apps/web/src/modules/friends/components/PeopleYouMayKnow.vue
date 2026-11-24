<script setup lang="ts">
import type { FriendSuggestion } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Button from '@/components/Button.vue'
import FriendRow from '@/modules/friends/components/FriendRow.vue'
import { friendsApi } from '@/modules/friends/services/api'
import { ApiRequestError } from '@/plugins/http'

type Row = FriendSuggestion & { sent: boolean; busy: boolean }
const rows = ref<Row[]>([])
const failed = ref(false)

// Kartu hanya muncul bila ada saran; gagal memuat tidak mengganggu halaman.
onMounted(async () => {
  try {
    rows.value = (await friendsApi.suggestions()).items.map((s) => ({
      ...s,
      sent: false,
      busy: false,
    }))
  } catch {
    rows.value = []
  }
})

const drop = (id: number) => (rows.value = rows.value.filter((r) => r.user.id !== id))

async function add(row: Row) {
  if (row.busy || row.sent) return
  row.busy = true
  failed.value = false
  try {
    await friendsApi.send(row.user.id)
    row.sent = true
  } catch (e) {
    // Sudah ada permintaan atau sudah berteman: hasilnya sama dengan terkirim. Pengguna hilang: buang barisnya.
    if (
      e instanceof ApiRequestError &&
      (e.code === 'REQUEST_PENDING' || e.code === 'ALREADY_FRIENDS')
    ) {
      row.sent = true
    } else if (e instanceof ApiRequestError && e.status === 404) drop(row.user.id)
    else failed.value = true
  } finally {
    row.busy = false
  }
}

const mutual = (n: number) => (n === 1 ? t('pymk.mutual.one') : t('pymk.mutual.many', { n }))
</script>

<template>
  <section v-if="rows.length" class="card" :aria-label="t('pymk.title')">
    <h2 class="card__head">{{ t('pymk.title') }}</h2>
    <p v-if="failed" class="form-error card__error" role="alert">{{ t('friends.error.action') }}</p>
    <ul class="list">
      <FriendRow v-for="r in rows" :key="r.user.id" :user="r.user" :meta="mutual(r.mutualFriends)">
        <Button v-if="!r.sent" :disabled="r.busy" @click="add(r)">{{
          t('profile.action.add')
        }}</Button>
        <span v-else class="card__sent">{{ t('pymk.sent') }}</span>
        <Button
          variant="default"
          :aria-label="`${t('pymk.remove')}: ${r.user.displayName}`"
          @click="drop(r.user.id)"
        >
          ×
        </Button>
      </FriendRow>
    </ul>
  </section>
</template>

<style scoped>
.card {
  margin-bottom: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
}
.card__head {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-base);
}
.card__error {
  margin: var(--sp-2) var(--sp-3) 0;
}
.card__sent {
  align-self: center;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
