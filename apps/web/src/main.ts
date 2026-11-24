import { APP_NAME } from '@retrobook/shared'
import '@retrobook/shared/tokens.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { setHttpHooks } from './api/http'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import './styles/base.css'

async function bootstrap() {
  document.title = APP_NAME
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  const auth = useAuthStore(pinia)
  setHttpHooks({
    onSessionLost: (reason) => {
      auth.clear()
      void router.push({ name: 'login', query: { reason } })
    },
  })
  await auth.init()

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

void bootstrap()
