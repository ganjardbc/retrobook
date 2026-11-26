import { APP_NAME } from '@retrobook/shared'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/core/router'
import { setupLocale } from '@/plugins/locale'
import { useAdminAuthStore } from '@/modules/auth/stores'
import '@/styles/admin.css'

async function bootstrap() {
  document.title = `${APP_NAME} · Admin`
  setupLocale()
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  const auth = useAdminAuthStore(pinia)
  window.addEventListener('admin:session-expired', () => {
    auth.clear()
    void router.replace({ name: 'admin-login', query: { reason: 'expired' } })
  })
  await auth.init()
  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
