import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '')
  return {
    envDir: '../..',
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5174,
      proxy: { '/api': `http://localhost:${env.API_PORT ?? 3000}` },
    },
  }
})
