<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref, watch } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useNotificationsStore } from '@/modules/notifications/stores'
import PokeCard from '@/modules/pokes/components/PokeCard.vue'
import { usePokesStore } from '@/modules/pokes/stores'

const auth = useAuthStore()
const store = usePokesStore()
const notifications = useNotificationsStore()
const actionError = ref(false)

onMounted(() => {
  // Data milik akun sebelumnya tidak boleh terlihat setelah ganti akun.
  if (store.ownerId !== (auth.user?.id ?? null)) store.reset(auth.user?.id ?? null)
  void store.refresh()
})
// Poke baru lewat realtime (notifikasi POKE): ambil ulang daftar.
watch(
  () => notifications.lastReceived,
  (n) => {
    if (n?.type === 'POKE') void store.refresh()
  },
)

async function run(action: Promise<boolean>) {
  actionError.value = !(await action)
}
</script>

<template>
  <div class="pokes">
    <p v-if="actionError" class="form-error" role="alert">{{ t('pokes.error.action') }}</p>
    <PageCard :title="t('pokes.title')" flush>
      <ul v-if="store.items.length" class="list">
        <PokeCard
          v-for="p in store.items"
          :key="p.user.id"
          :user="p.user"
          @poke-back="run(store.pokeBack(p.user.id))"
          @remove="run(store.remove(p.user.id))"
        />
      </ul>
      <LoadingRows v-else-if="store.loading" />
      <p v-else-if="store.failed" class="note" role="alert">
        {{ t('pokes.error.load') }}
        <Button variant="default" @click="store.load()">{{ t('feed.retry') }}</Button>
      </p>
      <EmptyState
        v-else
        icon="mdi:hand-pointing-right"
        :title="t('pokes.empty')"
        :hint="t('pokes.emptyHint')"
      />
      <div v-if="store.items.length && !store.done" class="more">
        <Button variant="default" :disabled="store.loading" @click="store.load()">{{
          t('pokes.loadMore')
        }}</Button>
      </div>
    </PageCard>
  </div>
</template>

<style scoped>
.more {
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
