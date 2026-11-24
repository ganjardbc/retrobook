<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ name: string; src?: string | null; size?: 's' | 'm' | 'l' }>(),
  { src: null, size: 's' },
)

const initial = computed(() => props.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <img
    v-if="src"
    class="avatar"
    :class="`avatar--${size}`"
    :src="src"
    :alt="t('avatar.alt', { name })"
  />
  <span
    v-else
    class="avatar avatar--blank"
    :class="`avatar--${size}`"
    role="img"
    :aria-label="t('avatar.alt', { name })"
  >
    {{ initial }}
  </span>
</template>

<style scoped>
/* Persegi dengan radius kecil, bukan bulat (UI spec 4). */
.avatar {
  display: inline-block;
  flex: none;
  border-radius: 2px;
  object-fit: cover;
  vertical-align: top;
}
.avatar--blank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand);
  color: var(--c-text-on-brand);
  font-weight: bold;
}
.avatar--s {
  width: var(--avatar-s);
  height: var(--avatar-s);
  font-size: var(--fs-post);
}
.avatar--m {
  width: var(--avatar-m);
  height: var(--avatar-m);
  font-size: var(--fs-title);
}
.avatar--l {
  width: var(--avatar-l);
  height: var(--avatar-l);
  font-size: var(--fs-name);
}
</style>
