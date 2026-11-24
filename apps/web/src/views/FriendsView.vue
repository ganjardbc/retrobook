<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from '../components/Button.vue'
import FriendRow from '../components/FriendRow.vue'
import { useAuthStore } from '../stores/auth'
import { useFriendsStore } from '../stores/friends'

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
function unfriend(id: number, name: string) {
  if (window.confirm(t('friends.unfriend.confirm', { name }))) void run(store.unfriend(id))
}
</script>

<template>
  <div class="friends">
    <h1 class="friends__title">{{ t('friends.title') }}</h1>
    <p v-if="actionError" class="form-error" role="alert">{{ t('friends.error.action') }}</p>

    <section v-if="store.requests.length" class="card" :aria-label="t('friends.requests.title')">
      <h2 class="card__head">{{ t('friends.requests.title') }}</h2>
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
      <div v-if="!store.requestsDone" class="card__more">
        <Button variant="default" :disabled="store.requestsLoading" @click="store.loadRequests()">{{
          t('friends.loadMore')
        }}</Button>
      </div>
    </section>

    <section class="card" :aria-label="t('friends.all')">
      <h2 class="card__head">
        {{ t('friends.all') }} <span class="card__count">{{ countLabel }}</span>
      </h2>
      <div class="card__search">
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
      <p v-else-if="store.friendsLoading" class="note" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="store.friendsFailed" class="note" role="alert">
        {{ t('friends.error.load') }}
        <Button variant="default" @click="store.loadFriends()">{{ t('feed.retry') }}</Button>
      </p>
      <p v-else class="note">{{ store.query ? t('friends.empty.search') : t('friends.empty') }}</p>

      <div v-if="store.friends.length && !store.friendsDone" class="card__more">
        <Button variant="default" :disabled="store.friendsLoading" @click="store.loadFriends()">{{
          t('friends.loadMore')
        }}</Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.friends {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.friends__title {
  margin: 0;
  font-size: var(--fs-title);
}
.card {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.card__head {
  margin: 0;
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-post);
}
.card__count {
  color: var(--c-text-muted);
  font-weight: normal;
}
.card__search {
  padding: var(--sp-2) var(--sp-3);
}
.card__search input {
  width: 100%;
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
  text-align: center;
}
</style>
