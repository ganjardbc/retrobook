<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { pokesApi } from '@/modules/pokes/services/api'
import { useProfileStore } from '@/modules/profile/stores'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'

const props = defineProps<{ profile: Profile }>()
const store = useProfileStore()
const photoError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

async function onPhoto(kind: 'avatar' | 'cover', e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoError.value = (await store.uploadPhoto(kind, file)) ?? ''
}

function unfriend() {
  if (window.confirm(t('profile.action.unfriend.confirm', { name: props.profile.displayName }))) {
    void store.relate('unfriend')
  }
}
const poked = ref(false)
const pokeFailed = ref(false)
async function poke() {
  pokeFailed.value = false
  try {
    await pokesApi.poke(props.profile.id)
    poked.value = true
  } catch {
    pokeFailed.value = true
  }
}
// Message (T-36) dan View Activity Log (Fase 3) ditambahkan bersama fiturnya.
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
      <template v-if="profile.relationship === 'SELF'">
        <button
          class="header__photo header__photo--cover"
          type="button"
          @click="coverInput?.click()"
        >
          <Icon icon="mdi:camera" inline aria-hidden="true" />
          {{ t('profile.photo.cover') }}
        </button>
        <input
          ref="coverInput"
          class="header__file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onPhoto('cover', $event)"
        />
      </template>
    </div>
    <div class="header__avatar">
      <Avatar :name="profile.displayName" :src="profile.avatarUrl" size="l" />
      <template v-if="profile.relationship === 'SELF'">
        <button
          class="header__photo header__photo--avatar"
          type="button"
          :aria-label="t('profile.photo.avatar')"
          :title="t('profile.photo.avatar')"
          @click="avatarInput?.click()"
        >
          <Icon icon="mdi:camera" aria-hidden="true" />
        </button>
        <input
          ref="avatarInput"
          class="header__file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onPhoto('avatar', $event)"
        />
      </template>
    </div>
    <h1 class="header__name">{{ profile.displayName }}</h1>

    <div class="header__actions">
      <Button v-if="profile.relationship === 'SELF'" variant="default" to="/me/edit">{{
        t('profile.action.updateInfo')
      }}</Button>
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
      <template v-else-if="profile.relationship === 'FRIENDS'">
        <Button variant="default" @click="unfriend">✓ {{ t('profile.action.friends') }}</Button>
        <Button variant="default" @click="poke">{{
          poked ? t('profile.action.poked') : t('profile.action.poke')
        }}</Button>
      </template>
    </div>
    <p v-if="photoError" class="form-error header__error" role="alert">{{ photoError }}</p>
    <p v-else-if="pokeFailed" class="form-error header__error" role="alert">
      {{ t('profile.action.error') }}
    </p>
    <p v-else-if="store.actionFailed" class="form-error header__error" role="alert">
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
.header__file {
  display: none;
}
.header__photo {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  border: 0;
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.55);
  color: var(--c-text-on-brand);
  font: inherit;
  cursor: pointer;
}
.header__photo--cover {
  position: absolute;
  top: var(--sp-3);
  left: var(--sp-3);
}
.header__photo--avatar {
  position: absolute;
  left: var(--sp-2);
  bottom: var(--sp-2);
}
</style>
