<script setup lang="ts">
import { splitHashtags } from '@retrobook/shared'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

// Teks pengguna tetap lewat interpolasi (bukan v-html); hanya #tag yang menjadi tautan.
const props = defineProps<{ text: string }>()
const parts = computed(() => splitHashtags(props.text))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <RouterLink
      v-if="part.tag"
      class="hashtag"
      :to="{ name: 'hashtag', params: { tag: part.tag } }"
      >{{ part.text }}</RouterLink
    >
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<style scoped>
.hashtag {
  color: var(--c-link);
}
</style>
