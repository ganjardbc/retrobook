import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // .env ada di akar monorepo; API_PORT dipakai untuk proxy dev (tanpa CORS).
  const env = loadEnv(mode, '../..', '')
  return {
    envDir: '../..',
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: { '/api': `http://localhost:${env.API_PORT ?? 3000}` },
    },
    test: { environment: 'jsdom' },
  }
})
