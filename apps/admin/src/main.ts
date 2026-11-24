import { APP_NAME } from '@retrobook/shared'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/core/router'
import { useAdminAuthStore } from '@/modules/auth/stores'
import '@/styles/admin.css'

async function bootstrap() {
  document.title = `${APP_NAME} · Admin`
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  await useAdminAuthStore(pinia).init()
  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
