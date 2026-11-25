<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { ApiRequestError } from '@/plugins/http'
import { groupsApi } from '../services/api'
import type { GroupSummary } from '@retrobook/shared'
import type { Post } from '@retrobook/shared'

const route = useRoute()
const group = ref<GroupSummary | null>(null)
const posts = ref<Post[]>([])
const content = ref('')
const error = ref('')
async function load() {
  const id = Number(route.params.id)
  try {
    group.value = await groupsApi.get(id)
    if (group.value.isMember) posts.value = (await groupsApi.posts(id)).items
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Grup tidak ditemukan.'
  }
}
async function join() {
  try {
    group.value = await groupsApi.join(Number(route.params.id))
    posts.value = (await groupsApi.posts(group.value.id)).items
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Tidak bisa bergabung.'
  }
}
async function leave() {
  if (!group.value) return
  try {
    await groupsApi.leave(group.value.id)
    group.value = { ...group.value, isMember: false }
    posts.value = []
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Tidak bisa keluar dari grup.'
  }
}
async function publish() {
  if (!group.value || !content.value.trim()) return
  try {
    posts.value.unshift(await groupsApi.createPost(group.value.id, content.value.trim()))
    content.value = ''
  } catch (cause) {
    error.value = cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Post gagal dibuat.'
  }
}
onMounted(() => void load())
</script>

<template>
  <main v-if="group" class="group">
    <header>
      <div>
        <h1>{{ group.name }}</h1>
        <p>
          {{ group.memberCount }} anggota · {{ group.privacy === 'PUBLIC' ? 'Publik' : 'Tertutup' }}
        </p>
        <p>{{ group.description }}</p>
      </div>
      <Button v-if="!group.isMember" @click="join">Join</Button
      ><Button v-else variant="default" @click="leave">Leave</Button>
    </header>
    <p v-if="error" role="alert">{{ error }}</p>
    <form v-if="group.isMember" class="group__composer" @submit.prevent="publish">
      <label for="group-post">Tulis post ke grup</label
      ><textarea id="group-post" v-model="content" maxlength="5000" rows="3" /><Button
        type="submit"
        :disabled="!content.trim()"
        >Post</Button
      >
    </form>
    <p v-else class="group__note">Gabung ke grup untuk melihat post anggota.</p>
    <PostCard v-for="post in posts" :key="post.id" :post="post" />
    <p v-if="group.isMember && !posts.length">Belum ada post di grup ini.</p>
  </main>
  <p v-else-if="error" role="alert">{{ error }}</p>
</template>

<style scoped>
.group {
  display: grid;
  gap: var(--sp-3);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h1 {
  margin: 0;
}
header p {
  margin: var(--sp-1) 0;
  color: var(--c-text-muted);
}
.group__composer,
.group__note {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
textarea {
  width: 100%;
  resize: vertical;
}
</style>
