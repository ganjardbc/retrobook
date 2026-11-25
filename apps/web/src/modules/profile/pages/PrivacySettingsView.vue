<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { meApi, type PrivacySettings } from '@/modules/profile/services/me'
import { useAuthStore } from '@/modules/auth/stores'
import { useRouter } from 'vue-router'

const settings = reactive<PrivacySettings>({
  profileInfoPrivacy: 'PUBLIC',
  friendsPrivacy: 'PUBLIC',
  defaultPostPrivacy: 'FRIENDS',
})
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()
onMounted(async () => {
  try {
    Object.assign(settings, await meApi.privacy())
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Pengaturan gagal dimuat.'
  } finally {
    loading.value = false
  }
})
async function save() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    Object.assign(settings, await meApi.updatePrivacy({ ...settings }))
    message.value = 'Pengaturan privasi disimpan.'
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Pengaturan gagal disimpan.'
  } finally {
    saving.value = false
  }
}
async function deleteAccount() {
  error.value = ''
  message.value = ''
  if (
    !window.confirm(
      'Hapus akun? Akun dan konten akan disembunyikan sekarang, lalu identitas dianonimkan setelah 30 hari.',
    )
  )
    return
  try {
    await meApi.deleteAccount(password.value)
    auth.clear()
    await router.replace('/login')
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Akun gagal dihapus.'
  }
}
</script>

<template>
  <main class="privacy">
    <h1>Pengaturan privasi</h1>
    <p v-if="loading" role="status">Memuat…</p>
    <form v-else @submit.prevent="save">
      <label
        >Info profil<select v-model="settings.profileInfoPrivacy">
          <option value="PUBLIC">Semua member</option>
          <option value="FRIENDS">Teman</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      ><label
        >Daftar teman<select v-model="settings.friendsPrivacy">
          <option value="PUBLIC">Semua member</option>
          <option value="FRIENDS">Teman</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      ><label
        >Privasi default post baru<select v-model="settings.defaultPostPrivacy">
          <option value="PUBLIC">Semua member</option>
          <option value="FRIENDS">Teman</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      >
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>
      <Button type="submit" :disabled="saving">Simpan</Button>
    </form>
    <section class="privacy__delete">
      <h2>Hapus akun</h2>
      <p>Akun dan kontennya langsung disembunyikan; identitas dianonimkan setelah 30 hari.</p>
      <form @submit.prevent="deleteAccount">
        <label
          >Konfirmasi password<input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
        /></label>
        <Button type="submit" :disabled="!password">Hapus akun</Button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.privacy {
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h1 {
  margin-top: 0;
}
form {
  display: grid;
  gap: var(--sp-3);
  max-width: 540px;
}
label {
  display: grid;
  gap: 4px;
}
.privacy__delete {
  margin-top: var(--sp-5);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.privacy__delete h2 {
  margin: 0;
}
</style>
