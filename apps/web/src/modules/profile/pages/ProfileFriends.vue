<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted } from 'vue'
import Button from '@/components/Button.vue'
import FriendRow from '@/modules/friends/components/FriendRow.vue'
import { useProfileStore } from '@/modules/profile/stores'

const store = useProfileStore()
const list = store.friends

// Daftar sudah mulai dimuat bersama profil; panggilan ini aman (diabaikan bila sedang memuat atau habis).
onMounted(() => void list.loadMore())
</script>

<template>
  <section class="friends" :aria-label="t('profile.friends.title')">
    <p v-if="store.profile?.friendsVisible === false" class="friends__note">
      Daftar teman disetel privat.
    </p>
    <template v-else>
      <h2 class="friends__head">
        {{ t('profile.friends.title') }}
        <span class="friends__count">{{ store.profile?.friendCount }}</span>
      </h2>
      <ul v-if="list.items.length" class="friends__list">
        <FriendRow v-for="u in list.items" :key="u.id" :user="u" />
      </ul>
      <p v-else-if="list.loading" class="friends__note" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="list.failed" class="friends__note" role="alert">
        {{ t('friends.error.load') }}
        <Button variant="default" @click="list.loadMore()">{{ t('feed.retry') }}</Button>
      </p>
      <p v-else class="friends__note">{{ t('profile.friends.empty') }}</p>
      <div v-if="list.items.length && !list.done" class="friends__more">
        <Button variant="default" :disabled="list.loading" @click="list.loadMore()">{{
          t('profile.more')
        }}</Button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.friends {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.friends__head {
  margin: 0;
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-post);
}
.friends__count {
  color: var(--c-text-muted);
  font-weight: normal;
}
.friends__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.friends__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
.friends__more {
  padding: var(--sp-3);
  text-align: center;
}
</style>
