import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'

function loadDotEnv() {
  try {
    const text = readFileSync('.env', 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (key) {
        if (process.env.CI && key.startsWith('DAYACT_')) continue
        if (
          key.startsWith('VITE_') ||
          key === 'GEMINI_API_KEY' ||
          key.startsWith('DAYACT_')
        ) {
          process.env[key] = value
        }
      }
    }
  } catch {
    /* no .env */
  }
}

loadDotEnv()

const port = 5199
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
