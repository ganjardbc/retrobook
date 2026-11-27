import { defineConfig } from '@playwright/test'

// Port khusus e2e dan tanpa reuse: e2e tidak boleh menyentuh server dev (dan DB dev) yang sedang berjalan.
const apiPort = process.env.E2E_API_PORT ?? '3031'
const webPort = process.env.E2E_WEB_PORT ?? '5183'
const adminPort = process.env.E2E_ADMIN_PORT ?? '5184'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Dua worker: dengan lima worker bawaan, tes paralel berebut satu database dan API sehingga muncul
  // "write conflict or a deadlock" dan kegagalan acak; dengan dua worker 12 run berturut-turut hijau.
  workers: Number(process.env.E2E_WORKERS ?? 2),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @retrobook/api dev',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      env: { RATE_LIMIT_DISABLED: 'true', BOTS_DISABLED: 'true', API_PORT: apiPort },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @retrobook/web dev --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      env: { API_PORT: apiPort },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @retrobook/admin dev --host 127.0.0.1 --port ${adminPort} --strictPort`,
      url: `http://127.0.0.1:${adminPort}`,
      env: { API_PORT: apiPort },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
