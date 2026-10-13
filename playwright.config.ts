import { defineConfig, devices } from '@playwright/test'

/**
 * §11 acceptance flow against a running platform + a test API (it creates organizations, users and
 * orders — never point it at production):
 *   E2E_BASE_URL        platform origin (default http://localhost:5174 — `npm run dev`)
 *   E2E_API_URL         API origin for admin/customer/technician steps (default http://localhost:5123)
 *   E2E_OTP             the fixed verification code of the test API (run-local-test.cmd: 1111)
 *   E2E_ADMIN_USERNAME  platform staff that can approve providers and assign items
 *   E2E_ADMIN_PASSWORD  its password
 * Specs skip themselves when those are missing. Browsers: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
})
