<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import FriendRow from '@/modules/friends/components/FriendRow.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useFriendsStore } from '@/modules/friends/stores'

const auth = useAuthStore()
const store = useFriendsStore()
const search = ref('')
const actionError = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const countLabel = computed(() =>
  store.total === 1 ? t('friends.count.one') : t('friends.count.many', { n: store.total }),
)

onMounted(() => {
  // Data milik akun sebelumnya tidak boleh terlihat setelah ganti akun.
  if (store.ownerId !== (auth.user?.id ?? null)) store.reset(auth.user?.id ?? null)
  search.value = store.query
  void store.loadRequests()
  void store.loadFriends()
})
onBeforeUnmount(() => clearTimeout(timer))

function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => void store.search(search.value), 300)
}

async function run(action: Promise<boolean>) {
  actionError.value = !(await action)
}
function unfriend(id: string, name: string) {
  if (window.confirm(t('friends.unfriend.confirm', { name }))) void run(store.unfriend(id))
}
</script>

<template>
  <div class="friends">
    <p v-if="actionError" class="form-error" role="alert">{{ t('friends.error.action') }}</p>

    <PageCard v-if="store.requests.length" :title="t('friends.requests.title')" heading="h2" flush>
      <ul class="list">
        <FriendRow v-for="r in store.requests" :key="r.user.id" :user="r.user">
          <Button variant="success" @click="run(store.accept(r.user.id))">{{
            t('friends.requests.confirm')
          }}</Button>
          <Button variant="default" @click="run(store.reject(r.user.id))">{{
            t('friends.requests.delete')
          }}</Button>
        </FriendRow>
      </ul>
      <div v-if="!store.requestsDone" class="more">
        <Button variant="default" :disabled="store.requestsLoading" @click="store.loadRequests()">{{
          t('friends.loadMore')
        }}</Button>
      </div>
    </PageCard>

    <PageCard :title="t('friends.all')" flush>
      <template #actions>
        <span class="count">{{ countLabel }}</span>
      </template>
      <div class="search">
        <input
          v-model="search"
          type="search"
          maxlength="80"
          :placeholder="t('friends.search')"
          :aria-label="t('friends.search')"
          @input="onSearch"
        />
      </div>
      <ul v-if="store.friends.length" class="list">
        <FriendRow v-for="u in store.friends" :key="u.id" :user="u">
          <Button variant="default" @click="unfriend(u.id, u.displayName)">{{
            t('friends.unfriend')
          }}</Button>
        </FriendRow>
      </ul>
      <LoadingRows v-else-if="store.friendsLoading" />
      <p v-else-if="store.friendsFailed" class="note" role="alert">
        {{ t('friends.error.load') }}
        <Button variant="default" @click="store.loadFriends()">{{ t('feed.retry') }}</Button>
      </p>
      <EmptyState
        v-else
        icon="mdi:account-multiple-outline"
        :title="store.query ? t('friends.empty.search') : t('friends.empty')"
        :hint="store.query ? undefined : t('friends.emptyHint')"
      />
      <div v-if="store.friends.length && !store.friendsDone" class="more">
        <Button variant="default" :disabled="store.friendsLoading" @click="store.loadFriends()">{{
          t('friends.loadMore')
        }}</Button>
      </div>
    </PageCard>
  </div>
</template>

<style scoped>
.friends {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.count {
  color: var(--c-text-muted);
}
.search {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--c-border-soft);
}
.search input {
  width: 100%;
  box-sizing: border-box;
}
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
  text-align: center;
}
</style>
