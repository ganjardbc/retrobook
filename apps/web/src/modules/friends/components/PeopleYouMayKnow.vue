<script setup lang="ts">
import type { FriendSuggestion } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import Button from '@/components/Button.vue'
import PageCard from '@/components/PageCard.vue'
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

const drop = (id: string) => (rows.value = rows.value.filter((r) => r.user.id !== id))

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
  <PageCard v-if="rows.length" class="pymk" quiet :title="t('pymk.title')" heading="h2" flush>
    <p v-if="failed" class="form-error pymk__error" role="alert">{{ t('friends.error.action') }}</p>
    <ul class="pymk__list">
      <FriendRow
        v-for="r in rows"
        :key="r.user.id"
        compact
        :user="r.user"
        :meta="mutual(r.mutualFriends)"
      >
        <Button
          v-if="!r.sent"
          class="pymk__add"
          variant="default"
          :disabled="r.busy"
          @click="add(r)"
        >
          <Icon icon="mdi:account-plus" aria-hidden="true" />{{ t('profile.action.add') }}
        </Button>
        <span v-else class="pymk__sent">
          <Icon icon="mdi:check" aria-hidden="true" />{{ t('pymk.sent') }}
        </span>
        <template #corner>
          <button
            type="button"
            class="pymk__x"
            :aria-label="`${t('pymk.remove')}: ${r.user.displayName}`"
            @click="drop(r.user.id)"
          >
            ×
          </button>
        </template>
      </FriendRow>
    </ul>
  </PageCard>
</template>

<style scoped>
.pymk {
  margin-bottom: var(--sp-3);
}
.pymk__error {
  margin: var(--sp-2) var(--sp-3) 0;
}
.pymk__list {
  margin: 0;
  padding: var(--sp-1) 0;
  list-style: none;
}
.pymk__sent {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
/* Tombol sekunder abu terang bergaya 2015: ringan di kartu samping. */
.pymk__add {
  min-height: 22px;
  gap: var(--sp-1);
  padding: 0 var(--sp-2);
  font-size: var(--fs-small);
}
.pymk__x {
  padding: 0 var(--sp-1);
  border: 0;
  background: none;
  color: var(--c-text-muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.pymk__x:hover {
  color: var(--c-text);
}
</style>
