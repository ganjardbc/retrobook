<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { useProfileStore } from '../stores/profile'
import Avatar from './Avatar.vue'
import Button from './Button.vue'

const props = defineProps<{ profile: Profile }>()
const store = useProfileStore()

function unfriend() {
  if (window.confirm(t('profile.action.unfriend.confirm', { name: props.profile.displayName }))) {
    void store.relate('unfriend')
  }
}
// Message (T-36), Update Info (T-22), dan View Activity Log (Fase 3) ditambahkan bersama fiturnya.
</script>

<template>
  <header class="header">
    <div class="header__cover">
      <img
        v-if="profile.coverUrl"
        :src="profile.coverUrl"
        :alt="t('profile.cover')"
        class="header__img"
      />
    </div>
    <div class="header__avatar">
      <Avatar :name="profile.displayName" :src="profile.avatarUrl" size="l" />
    </div>
    <h1 class="header__name">{{ profile.displayName }}</h1>

    <div class="header__actions">
      <Button v-if="profile.relationship === 'NONE'" @click="store.relate('send')">{{
        t('profile.action.add')
      }}</Button>
      <Button
        v-else-if="profile.relationship === 'REQUEST_SENT'"
        variant="default"
        @click="store.relate('cancel')"
      >
        {{ t('profile.action.cancel') }}
      </Button>
      <template v-else-if="profile.relationship === 'REQUEST_RECEIVED'">
        <Button variant="success" @click="store.relate('accept')">{{
          t('profile.action.confirm')
        }}</Button>
        <Button variant="default" @click="store.relate('reject')">{{
          t('profile.action.delete')
        }}</Button>
      </template>
      <Button v-else-if="profile.relationship === 'FRIENDS'" variant="default" @click="unfriend">
        ✓ {{ t('profile.action.friends') }}
      </Button>
    </div>
    <p v-if="store.actionFailed" class="form-error header__error" role="alert">
      {{ t('profile.action.error') }}
    </p>
  </header>
</template>

<style scoped>
.header {
  position: relative;
  background: var(--c-card);
  border: var(--card-border);
}
.header__cover {
  height: var(--h-cover);
  background: linear-gradient(135deg, var(--c-brand-dark), var(--c-brand));
  overflow: hidden;
}
.header__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Foto profil menumpuk di kiri bawah cover dengan border putih (UI spec 4, ProfileHeader). */
.header__avatar {
  position: absolute;
  left: var(--sp-4);
  bottom: calc(-1 * var(--sp-4));
  padding: 3px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  line-height: 0;
}
.header__name {
  position: absolute;
  left: calc(var(--avatar-l) + 2 * var(--sp-4) + var(--sp-3));
  bottom: var(--sp-5);
  margin: 0;
  color: var(--c-text-on-brand);
  font-size: var(--fs-name);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}
.header__actions {
  position: absolute;
  right: var(--sp-3);
  bottom: var(--sp-3);
  display: flex;
  gap: var(--sp-2);
}
.header__error {
  position: absolute;
  right: var(--sp-3);
  bottom: calc(-1 * var(--sp-5) - var(--sp-3));
  margin: 0;
}
@media (max-width: 640px) {
  .header__cover {
    height: 160px;
  }
  .header__avatar :deep(.avatar--l) {
    width: var(--avatar-m);
    height: var(--avatar-m);
  }
  .header__name {
    left: calc(var(--avatar-m) + 2 * var(--sp-4) + var(--sp-2));
    font-size: var(--fs-title);
    bottom: var(--sp-3);
  }
  .header__actions {
    top: var(--sp-2);
    bottom: auto;
  }
}
</style>
