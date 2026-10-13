import { expect, request, type APIRequestContext, type Page } from '@playwright/test'

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5123'
export const OTP = process.env.E2E_OTP ?? ''
export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? ''
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''
export const READY = Boolean(OTP && ADMIN_USERNAME && ADMIN_PASSWORD)

/** Nine local digits (`5XXXXXXXX`) unique to this run; `+n` gives related numbers. */
export function runPhones() {
  const base = 550_000_000 + (Date.now() % 40_000_000)
  return (offset: number) => String(base + offset)
}

export const e164 = (digits: string) => `+966${digits}`

interface Envelope<T> {
  success: boolean
  message: string
  errorCode: string | null
  data: T
}

/**
 * Auth endpoints allow 10 requests a minute per IP (§4); one run signs in more often than that,
 * so a 429 on them waits and retries instead of failing the flow.
 */
const AUTH_RETRIES = 6
const AUTH_BACKOFF_MS = 12_000

export async function api<T>(ctx: APIRequestContext, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, token?: string): Promise<T> {
  const isAuth = /\/auth\/|\/registration/.test(path)
  let res = await send(ctx, method, path, body, token)
  for (let attempt = 0; isAuth && res.status() === 429 && attempt < AUTH_RETRIES; attempt++) {
    await new Promise((r) => setTimeout(r, AUTH_BACKOFF_MS))
    res = await send(ctx, method, path, body, token)
  }
  const json = (await res.json().catch(() => ({}))) as Envelope<T>
  if (!res.ok() || json.success === false) throw new Error(`${method} ${path} → ${res.status()} ${json.errorCode ?? ''} ${json.message ?? ''}`)
  return json.data
}

function send(ctx: APIRequestContext, method: string, path: string, body: unknown, token: string | undefined) {
  return ctx.fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'ar', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    data: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function apiContext() {
  return request.newContext()
}

let cachedAdmin: string | null = null

/** One admin sign-in per run (the token lasts hours; sign-ins count against the auth limit). */
export async function adminToken(ctx: APIRequestContext): Promise<string> {
  cachedAdmin ??= (await api<{ accessToken: string }>(ctx, 'POST', '/api/auth/login', { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, deviceId: 'e2e-admin' })).accessToken
  return cachedAdmin
}

/** Phone + code sign-in for a technician or customer, the way their apps do it. */
export async function otpToken(ctx: APIRequestContext, phone: string, kind: 'staff' | 'customer'): Promise<string> {
  const prefix = kind === 'customer' ? '/api/customer/auth' : '/api/auth'
  await api(ctx, 'POST', `${prefix}/request-otp`, { phoneNumber: phone }).catch(() => undefined)
  const auth = await api<{ accessToken: string }>(ctx, 'POST', `${prefix}/verify-otp`, { phoneNumber: phone, code: OTP, deviceId: `e2e-${kind}-${phone}` })
  return auth.accessToken
}

/** Types the code into the boxes (they advance on their own). */
export async function enterOtp(page: Page) {
  await page.getByLabel('رمز التحقق 1', { exact: true }).click()
  await page.keyboard.type(OTP, { delay: 60 })
}

/** Provider platform sign-in (§5.1): phone → code. */
export async function signIn(page: Page, digits: string) {
  await page.goto('/login')
  await page.locator('#phone').fill(digits)
  await page.getByRole('button', { name: 'إرسال الرمز' }).click()
  await enterOtp(page)
}

/** The signed-in owner's/supervisor's access token, read from the page's storage. */
export async function pageToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith('.accessToken') && k.startsWith('siana.provider'))
    return key ? (JSON.parse(localStorage.getItem(key) ?? 'null') as string) : ''
  })
}

/** A tiny valid PDF (the API checks the content, not only the extension). */
export function pdfBuffer(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  )
}

export async function closeDialogs(page: Page) {
  while (await page.getByRole('dialog').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }
}

export async function toast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible()
}
