<script setup lang="ts">
import { PRIVACIES } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import PageCard from '@/components/PageCard.vue'
import { PRIVACY_ICONS } from '@/helpers/privacy'
import { ApiRequestError } from '@/plugins/http'
import { albumsApi, type Album } from '../services/albums'

const privacyOptions = computed<IconOption[]>(() =>
  PRIVACIES.map((p) => ({ value: p, label: t(`privacy.${p}`), icon: PRIVACY_ICONS[p] })),
)

const albums = ref<Album[]>([])
const showForm = ref(false)
const name = ref('')
const privacy = ref<Album['privacy']>('FRIENDS')
const error = ref('')
const loading = ref(true)
const saving = ref(false)

async function load() {
  try {
    albums.value = await albumsApi.list()
  } catch {
    error.value = t('albums.loadError')
  } finally {
    loading.value = false
  }
}
function closeForm() {
  showForm.value = false
  name.value = ''
}
async function create() {
  error.value = ''
  const albumName = name.value.trim()
  if (!albumName) {
    error.value = t('albums.nameRequired')
    return
  }
  saving.value = true
  try {
    albums.value.unshift(await albumsApi.create(albumName, privacy.value))
    closeForm()
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : t('albums.createError')
  } finally {
    saving.value = false
  }
}
const count = (album: Album) => {
  const n = album._count?.photos ?? 0
  return t(n === 1 ? 'albums.photos.one' : 'albums.photos.other', { count: n })
}
onMounted(() => void load())
</script>

<template>
  <PageCard :title="t('albums.title')">
    <template #actions>
      <Button v-if="!showForm" @click="showForm = true">{{ t('albums.create') }}</Button>
    </template>
    <form v-if="showForm" class="form" @submit.prevent="create">
      <FormRow :label="t('albums.name')" for-id="album-name">
        <input id="album-name" v-model="name" maxlength="80" required />
      </FormRow>
      <FormRow :label="t('albums.privacy')">
        <IconSelect v-model="privacy" :options="privacyOptions" :label="t('albums.privacy')" />
      </FormRow>
      <div class="form__actions">
        <Button type="submit" :disabled="!name.trim() || saving">{{
          saving ? t('albums.saving') : t('albums.save')
        }}</Button>
        <Button variant="default" @click="closeForm">{{ t('page.cancel') }}</Button>
      </div>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">{{ t('page.loading') }}</p>
    <ul v-if="albums.length" class="grid">
      <li v-for="album in albums" :key="album.id">
        <RouterLink class="tile" :to="`/albums/${album.id}`">
          <span class="tile__cover">
            <img v-if="album.photos?.[0]" :src="album.photos[0].url" alt="" />
            <Icon v-else icon="mdi:image-outline" class="tile__placeholder" aria-hidden="true" />
          </span>
          <span class="tile__name">{{ album.name }}</span>
          <small>{{ count(album) }}</small>
        </RouterLink>
      </li>
    </ul>
    <EmptyState
      v-else-if="!loading"
      icon="mdi:image-multiple-outline"
      :title="t('albums.empty')"
      :hint="t('albums.emptyHint')"
    />
  </PageCard>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
}
.form__actions {
  display: flex;
  gap: var(--sp-2);
  padding-left: 118px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--c-text);
  text-decoration: none;
}
.tile__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border);
}
.tile__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tile__placeholder {
  font-size: 40px;
  color: var(--c-border);
}
.tile__name {
  margin-top: var(--sp-1);
  color: var(--c-link);
  font-weight: bold;
  overflow-wrap: anywhere;
}
.tile:hover .tile__name {
  text-decoration: underline;
}
small {
  color: var(--c-text-muted);
}
@media (max-width: 560px) {
  .form__actions {
    padding-left: 0;
  }
}
</style>
