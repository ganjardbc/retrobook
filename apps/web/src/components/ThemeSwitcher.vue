<script setup lang="ts">
import { THEMES, type Theme } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { ref } from 'vue'
import { readTheme, setTheme } from '@/helpers/theme'

const current = ref<Theme>(readTheme())
function choose(theme: Theme) {
  current.value = theme
  setTheme(theme)
}
</script>

<template>
  <span class="themes" role="group" :aria-label="t('theme.label')">
    {{ t('theme.label') }}:
    <button
      v-for="theme in THEMES"
      :key="theme"
      type="button"
      class="themes__btn"
      :class="{ 'themes__btn--on': theme === current }"
      :aria-pressed="theme === current"
      @click="choose(theme)"
    >
      {{ theme }}
    </button>
  </span>
</template>

<style scoped>
.themes {
  display: inline-flex;
  gap: var(--sp-1);
  align-items: center;
}
.themes__btn {
  border: 0;
  background: transparent;
  color: var(--c-link);
  cursor: pointer;
  font: inherit;
  padding: 0 var(--sp-1);
}
.themes__btn--on {
  color: var(--c-text);
  font-weight: bold;
}
</style>
