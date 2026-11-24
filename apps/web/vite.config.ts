import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // .env ada di akar monorepo; API_PORT dipakai untuk proxy dev (tanpa CORS).
  const env = loadEnv(mode, '../..', '')
  return {
    envDir: '../..',
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      proxy: {
        '/api': `http://localhost:${env.API_PORT ?? 3000}`,
        '/socket.io': { target: `http://localhost:${env.API_PORT ?? 3000}`, ws: true },
        '/uploads': `http://localhost:${env.API_PORT ?? 3000}`,
      },
    },
    test: { environment: 'jsdom' },
  }
})
