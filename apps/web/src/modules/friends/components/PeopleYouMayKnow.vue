<script setup lang="ts">
import type { FriendSuggestion } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
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
      <li v-for="r in rows" :key="r.user.id" class="row">
        <Avatar :name="r.user.displayName" :src="r.user.avatarUrl" size="s" />
        <div class="row__body">
          <RouterLink class="row__name" :to="`/${r.user.username}`">{{
            r.user.displayName
          }}</RouterLink>
          <div class="row__line">
            <span class="row__meta">{{ mutual(r.mutualFriends) }}</span>
            <Button
              v-if="!r.sent"
              class="row__add"
              variant="default"
              :disabled="r.busy"
              @click="add(r)"
            >
              <Icon icon="mdi:account-plus" aria-hidden="true" />{{ t('profile.action.add') }}
            </Button>
            <span v-else class="row__sent">
              <Icon icon="mdi:check" aria-hidden="true" />{{ t('pymk.sent') }}
            </span>
          </div>
        </div>
        <button
          type="button"
          class="row__x"
          :aria-label="`${t('pymk.remove')}: ${r.user.displayName}`"
          @click="drop(r.user.id)"
        >
          ×
        </button>
      </li>
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
.list {
  margin: 0;
  padding: var(--sp-1) 0;
  list-style: none;
}
.row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}
.row__body {
  flex: 1;
  min-width: 0;
}
.row__name {
  display: block;
  padding-right: var(--sp-4);
  overflow: hidden;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-1) var(--sp-2);
}
.row__meta,
.row__sent {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.row__sent {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
/* Tombol sekunder abu terang bergaya 2015: ringan di kartu samping. */
.row__add {
  min-height: 22px;
  gap: var(--sp-1);
  padding: 0 var(--sp-2);
  font-size: var(--fs-small);
}
.row__x {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-2);
  padding: 0 var(--sp-1);
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font-size: 16px;
  line-height: 1;
  opacity: 0;
  cursor: pointer;
}
.row:hover .row__x,
.row:focus-within .row__x {
  opacity: 1;
}
.row__x:hover {
  color: var(--c-text);
}
/* Layar sentuh tidak punya hover: tombol tutup selalu terlihat. */
@media (hover: none) {
  .row__x {
    opacity: 1;
  }
}
</style>
