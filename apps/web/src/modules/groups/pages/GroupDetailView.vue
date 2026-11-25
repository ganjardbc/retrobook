<script setup lang="ts">
import type { GroupSummary, Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageCard from '@/components/PageCard.vue'
import StatusBox from '@/modules/feed/components/StatusBox.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { ApiRequestError } from '@/plugins/http'
import { groupsApi } from '../services/api'

const route = useRoute()
const group = ref<GroupSummary | null>(null)
const posts = ref<Post[]>([])
const error = ref('')

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

async function load() {
  const id = Number(route.params.id)
  try {
    group.value = await groupsApi.get(id)
    if (group.value.isMember) posts.value = (await groupsApi.posts(id)).items
  } catch (cause) {
    error.value = message(cause, t('groups.notFound'))
  }
}
async function join() {
  try {
    group.value = await groupsApi.join(Number(route.params.id))
    posts.value = (await groupsApi.posts(group.value.id)).items
  } catch (cause) {
    error.value = message(cause, t('groups.joinError'))
  }
}
async function leave() {
  if (!group.value) return
  try {
    await groupsApi.leave(group.value.id)
    group.value = { ...group.value, isMember: false }
    posts.value = []
  } catch (cause) {
    error.value = message(cause, t('groups.leaveError'))
  }
}
function onPosted(post: Post) {
  posts.value.unshift(post)
}
onMounted(() => void load())
</script>

<template>
  <div class="group">
    <PageCard :title="group?.name ?? t('groups.title')">
      <template #actions>
        <RouterLink to="/groups">{{ t('groups.title') }}</RouterLink>
        <template v-if="group">
          <Button v-if="!group.isMember && group.privacy === 'PUBLIC'" @click="join">{{
            t('groups.join')
          }}</Button>
          <Button v-else-if="group.isMember" variant="default" @click="leave">{{
            t('groups.leave')
          }}</Button>
        </template>
      </template>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div v-if="group" class="about">
        <Avatar :name="group.name" size="l" />
        <div class="about__text">
          <span class="about__meta"
            >{{
              t(group.memberCount === 1 ? 'groups.members.one' : 'groups.members', {
                count: group.memberCount,
              })
            }}
            · {{ t(`groups.privacy.${group.privacy}`) }}</span
          >
          <p v-if="group.description">{{ group.description }}</p>
        </div>
      </div>
    </PageCard>

    <template v-if="group">
      <StatusBox v-if="group.isMember" :group-id="group.id" @posted="onPosted" />
      <EmptyState v-else icon="mdi:lock-outline" :title="t('groups.joinToSee')" class="locked" />
      <PostCard v-for="post in posts" :key="post.id" :post="post" />
      <EmptyState
        v-if="group.isMember && !posts.length"
        icon="mdi:comment-text-outline"
        :title="t('groups.noPosts')"
        class="locked"
      />
    </template>
  </div>
</template>

<style scoped>
.group {
  display: grid;
  gap: var(--sp-3);
}
.about {
  display: flex;
  gap: var(--sp-3);
}
.about__text {
  min-width: 0;
}
.about__meta {
  color: var(--c-text-muted);
}
.about__text p {
  margin: var(--sp-1) 0 0;
  overflow-wrap: anywhere;
}
.locked {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
</style>
