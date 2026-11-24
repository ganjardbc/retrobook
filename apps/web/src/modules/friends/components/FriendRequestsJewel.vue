<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import Jewel from '@/components/Jewel.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useFriendsStore } from '@/modules/friends/stores'
import { useNotificationsStore } from '@/modules/notifications/stores'

const auth = useAuthStore()
const friends = useFriendsStore()
const notifications = useNotificationsStore()
const open = ref(false)

onMounted(() => {
  if (friends.ownerId !== (auth.user?.id ?? null)) friends.reset(auth.user?.id ?? null)
  void friends.loadRequests()
})
// Permintaan baru lewat realtime: ambil ulang supaya badge dan daftar ikut berubah.
watch(
  () => notifications.lastReceived,
  (n) => {
    if (n?.type === 'FRIEND_REQUEST') void friends.refreshRequests()
  },
)
</script>

<template>
  <Jewel
    v-model:open="open"
    icon="mdi:account-multiple"
    :label="t('jewel.requests')"
    :count="friends.requests.length"
    :more="!friends.requestsDone"
  >
    <p v-if="friends.requestsFailed" class="note" role="alert">{{ t('jewel.error') }}</p>
    <p v-else-if="!friends.requests.length" class="note">{{ t('jewel.requests.empty') }}</p>
    <ul v-else class="list">
      <li v-for="r in friends.requests" :key="r.user.id" class="item">
        <Avatar :name="r.user.displayName" :src="r.user.avatarUrl" size="m" />
        <span class="item__body">
          <RouterLink class="item__name" :to="`/${r.user.username}`" @click="open = false">{{
            r.user.displayName
          }}</RouterLink>
          <span class="item__actions">
            <Button @click="friends.accept(r.user.id)">{{ t('friends.requests.confirm') }}</Button>
            <Button variant="default" @click="friends.reject(r.user.id)">{{
              t('friends.requests.delete')
            }}</Button>
          </span>
        </span>
      </li>
    </ul>
    <RouterLink class="all" to="/friends" @click="open = false">{{
      t('jewel.requests.seeAll')
    }}</RouterLink>
  </Jewel>
</template>

<style scoped>
.note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.list {
  max-height: 400px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.item {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.item__name {
  font-weight: bold;
}
.item__actions {
  display: flex;
  gap: var(--sp-2);
}
.all {
  display: block;
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border);
  background: var(--c-card-subtle);
  text-align: center;
}
</style>
