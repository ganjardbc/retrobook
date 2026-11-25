import { APP_NAME } from '@retrobook/shared'
import '@retrobook/shared/tokens.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setHttpHooks } from '@/plugins/http'
import App from '@/App.vue'
import { router } from '@/core/global-routes'
import { useAuthStore } from '@/modules/auth/stores'
import '@/styles/base.css'
import { applyTheme, readTheme } from '@/helpers/theme'

async function bootstrap() {
  document.title = APP_NAME
  applyTheme(readTheme())
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const auth = useAuthStore(pinia)
  setHttpHooks({
    onSessionLost: (reason) => {
      auth.clear()
      void router.push({ name: 'login', query: { reason } })
    },
    onMaintenance: () => {
      if (router.currentRoute.value.name !== 'maintenance') void router.push({ name: 'maintenance' })
    },
  })
  await auth.init()

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
