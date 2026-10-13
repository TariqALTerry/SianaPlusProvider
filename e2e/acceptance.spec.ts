import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import {
  adminToken,
  api,
  apiContext,
  closeDialogs,
  e164,
  enterOtp,
  otpToken,
  pageToken,
  pdfBuffer,
  READY,
  runPhones,
  signIn,
  toast,
} from './helpers'

/**
 * §11 acceptance, in order, on one fresh organization:
 *   1. /join registers a company → onboarding (5 steps); an incomplete submit highlights the missing
 *      steps; with a document, two capabilities, a drawn polygon and capacity 5 it submits.
 *   2. (the platform approves) the owner adds a supervisor and a technician; the supervisor gets no
 *      profile editing / supervisor management / submit; a technician's phone is refused.
 *   3. a customer order inside the polygon reaches Incoming; the picker ranks technicians with
 *      reasons; assigning hides the customer phone until the technician accepts; scheduling refuses
 *      the past and moves the item to Scheduled.
 * It mutates data: run it against the local test API only (see playwright.config.ts).
 */

test.skip(!READY, 'Set E2E_OTP, E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD (test API only) to run the acceptance flow')
test.describe.configure({ mode: 'serial' })

const phone = runPhones()
const OWNER = phone(0)
const SUPERVISOR = phone(1)
const TECH_NO_SKILLS = phone(2)
const TECH_COOLING = phone(3)
const CUSTOMER = phone(4)
const COOLING = 'صيانة تبريد وتكييف'
const FRIDGES = 'صيانة ثلاجات وفريزرات'

let ctx: APIRequestContext
let page: Page
let orgId = ''
let polygonCentre: { lat: number; lng: number } | null = null

test.beforeAll(async ({ browser }) => {
  ctx = await apiContext()
  page = await browser.newPage()
})

test.afterAll(async () => {
  await page?.close()
  await ctx?.dispose()
})

async function stepCard(name: string) {
  return page.locator('main a').filter({ hasText: name }).first()
}

async function newSignedInPage(browser: Browser, digits: string) {
  const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Riyadh', viewport: { width: 1366, height: 900 } })
  const p = await context.newPage()
  await signIn(p, digits)
  return p
}

test('1 · registration, onboarding checklist and submit for review', async () => {
  // Join (§5.2).
  await page.goto('/join')
  await page.locator('#phone').fill(`0${OWNER}`) // a 05… spelling works
  await page.getByRole('button', { name: 'إرسال الرمز' }).click()
  await enterOtp(page)
  await page.getByRole('radio', { name: /شركة صيانة/ }).click()
  await page.locator('#legalName').fill('شركة اختبار القبول للصيانة')
  await page.locator('#displayName').fill(`اختبار ${OWNER.slice(-4)}`)
  await page.locator('#ownerFullName').fill('مالك اختبار القبول')
  await expect(page.locator('#city')).toHaveValue('الرياض')
  await page.getByRole('button', { name: 'إنشاء المنشأة' }).click()

  // Onboarding mode with the 5-step checklist.
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByText('خطوات الإكمال')).toBeVisible()
  for (const step of ['الملف', 'الوثائق', 'القدرات', 'مناطق التغطية', 'السعة']) await expect(await stepCard(step)).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['الرئيسية', 'ملف المنشأة', 'الإشعارات'])
  orgId = (await api<{ id: string }>(ctx, 'GET', '/api/provider/organization', undefined, await pageToken(page))).id

  // An incomplete submit highlights what the server lists in missingSteps.
  await page.getByRole('button', { name: 'إرسال للمراجعة' }).click()
  for (const step of ['الوثائق', 'القدرات', 'مناطق التغطية']) await expect(await stepCard(step)).toContainText('ناقصة')
  await expect(await stepCard('السعة')).not.toContainText('ناقصة')

  // A document (PDF).
  await page.goto('/organization?tab=documents')
  await page.getByRole('button', { name: 'رفع وثيقة' }).first().click()
  const upload = page.getByRole('dialog')
  await upload.locator('input[type=file]').setInputFiles({ name: 'cr.pdf', mimeType: 'application/pdf', buffer: pdfBuffer() })
  await upload.locator('input[id$="-number"]').fill('1010123456')
  await upload.getByRole('button', { name: 'رفع وثيقة' }).click()
  await expect(page.locator('main').getByText('بانتظار المراجعة', { exact: true })).toBeVisible()

  // Two capabilities from the grouped picker.
  await page.goto('/organization?tab=capabilities')
  await page.locator('[role=checkbox]').filter({ hasText: COOLING }).first().click()
  await page.locator('[role=checkbox]').filter({ hasText: FRIDGES }).first().click()
  await expect(page.getByText('2 قدرة مختارة')).toBeVisible()
  await page.getByRole('button', { name: 'حفظ القدرات' }).click()
  await toast(page, 'تم حفظ القدرات')

  // A polygon drawn on the map (geoman), around the map's centre.
  await page.goto('/organization?tab=coverage')
  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()
  await page.getByRole('button', { name: 'رسم مضلّع' }).click()
  const box = (await map.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const points: Array<[number, number]> = [
    [cx - 45, cy - 35],
    [cx + 45, cy - 35],
    [cx + 45, cy + 35],
    [cx - 45, cy + 35],
  ]
  for (const [x, y] of points) {
    await page.mouse.click(x, y)
    await page.waitForTimeout(150)
  }
  await page.mouse.click(points[0]![0], points[0]![1])
  await page.locator('input[id$="-name"]').fill('منطقة اختبار القبول')
  await page.getByRole('button', { name: 'حفظ المنطقة' }).click()
  await toast(page, 'تم حفظ المنطقة')
  const areas = await api<Array<{ shape: string; latitude: number | null; longitude: number | null }>>(ctx, 'GET', '/api/provider/organization/coverage', undefined, await pageToken(page))
  const polygon = areas.find((a) => a.shape === 'Polygon')
  expect(polygon, 'a Polygon coverage area was saved').toBeTruthy()
  polygonCentre = { lat: polygon!.latitude!, lng: polygon!.longitude! }

  // Capacity 5.
  await page.goto('/organization?tab=operations')
  await page.locator('input[id$="-capacity"]').fill('5')
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await toast(page, 'تم حفظ إعدادات التشغيل')

  // Submit.
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'إرسال للمراجعة' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'إرسال', exact: true }).click()
  await expect(page.getByText('تم إرسال ملفك للمراجعة').first()).toBeVisible()
  await expect(page.getByText('طلبك قيد المراجعة — سنبلغك بالنتيجة')).toBeVisible()
})

test('2 · supervisor restrictions and technician refusal', async ({ browser }) => {
  // The platform approves (admin API).
  const admin = await adminToken(ctx)
  await api(ctx, 'POST', `/api/admin/providers/${orgId}/review/start`, {}, admin).catch(() => undefined)
  await api(ctx, 'POST', `/api/admin/providers/${orgId}/approve`, { notes: 'E2E acceptance' }, admin)
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'الطلبات الواردة' })).toBeVisible()

  // The owner adds a supervisor…
  await page.goto('/team?tab=supervisors')
  await page.getByRole('button', { name: 'إضافة مشرف' }).first().click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('الاسم الكامل').fill('مشرف اختبار القبول')
  await dialog.locator('input[type=tel]').fill(`0${SUPERVISOR}`)
  await dialog.locator('button[type=submit]').click()
  await expect(dialog.getByText('تمت إضافة المشرف')).toBeVisible()
  await closeDialogs(page)

  // …and a technician without skills (used for the refusal and, later, as an ineligible candidate).
  await page.goto('/team?tab=technicians')
  await page.getByRole('button', { name: 'إضافة فني' }).first().click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('الاسم الكامل').fill('فني بلا مهارات')
  await dialog.locator('input[type=tel]').fill(`0${TECH_NO_SKILLS}`)
  await dialog.locator('button[type=submit]').click()
  await expect(dialog.getByText('تمت إضافة الفني')).toBeVisible()
  await closeDialogs(page)

  // The supervisor: no profile editing, no supervisor management, no submit.
  const sup = await newSignedInPage(browser, SUPERVISOR)
  await expect(sup.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'الطلبات الواردة' })).toBeVisible()
  await sup.goto('/organization?tab=profile')
  await expect(sup.getByRole('button', { name: /حفظ/ })).toHaveCount(0)
  await sup.goto('/team')
  await expect(sup.getByRole('tab', { name: /الفنيون/ })).toBeVisible()
  await expect(sup.getByRole('tab', { name: /المشرفون/ })).toHaveCount(0)
  await sup.goto('/team?tab=supervisors')
  await expect(sup.getByRole('button', { name: 'إضافة مشرف' })).toHaveCount(0)
  await sup.goto('/onboarding')
  await expect(sup.getByRole('button', { name: 'إرسال للمراجعة' })).toHaveCount(0)
  await sup.context().close()

  // A technician's phone is refused with the technician-app message, and no session is kept.
  const tech = await newSignedInPage(browser, TECH_NO_SKILLS)
  await expect(tech.getByText('حسابك حساب فني. استخدم تطبيق صيانة بلس للفنيين')).toBeVisible()
  await expect(tech).toHaveURL(/\/login/)
  expect(await pageToken(tech)).toBeFalsy()
  await tech.context().close()
})

test('3 · incoming → candidate picker → assign (phone hidden) → schedule', async () => {
  // Up to ~80 s waiting for the every-minute auto-assignment job, plus the UI steps.
  test.setTimeout(360_000)
  expect(polygonCentre, 'test 1 saved a polygon').toBeTruthy()
  const admin = await adminToken(ctx)

  // A customer order at the polygon's centre, for a cooling service.
  const services = await api<Array<{ id: string; nameAr: string }>>(ctx, 'GET', `/api/catalog/services/search?q=${encodeURIComponent('صيانة مكيف')}`)
  const service = services.find((s) => s.nameAr === 'صيانة مكيف') ?? services[0]
  expect(service, 'a cooling service exists in the catalog').toBeTruthy()
  const customer = await otpToken(ctx, e164(CUSTOMER), 'customer')
  const address = await api<{ id: string }>(ctx, 'POST', '/api/customer/addresses', {
    label: 'المنزل', city: 'الرياض', district: 'حي الاختبار', street: 'شارع الاختبار', buildingNumber: '1',
    latitude: polygonCentre!.lat, longitude: polygonCentre!.lng, isDefault: true,
  }, customer)
  await api(ctx, 'DELETE', '/api/customer/cart', undefined, customer).catch(() => undefined)
  await api(ctx, 'POST', '/api/customer/cart/items', { canonicalServiceId: service!.id, customerDescription: 'المكيف لا يبرد (اختبار قبول)', devices: [{ name: 'مكيف سبليت', issueDescription: 'لا يبرد' }] }, customer)
  const start = new Date(Date.now() + 26 * 3600_000)
  const order = await api<{ orderNumber: string }>(ctx, 'POST', '/api/customer/cart/checkout', {
    addressId: address.id, paymentMethod: 'Cash', preferredStart: start.toISOString(), preferredEnd: new Date(start.getTime() + 2 * 3600_000).toISOString(),
  }, customer)

  // The every-minute auto-assignment should route it here (no other provider covers the drawn
  // area unless demo providers are enabled). If another provider won it, route it by hand so the
  // rest of the flow still runs — the Incoming assertion below is the platform's part.
  type AdminItem = { id: string; itemNumber: string; status: string; provider: { id: string } | null }
  const findItem = async () => (await api<{ items: AdminItem[] }>(ctx, 'GET', `/api/admin/service-items?search=${order.orderNumber}&pageSize=5`, undefined, admin)).items[0]!
  let item = await findItem()
  for (let i = 0; i < 40 && !item.provider; i++) {
    await page.waitForTimeout(2_000)
    item = await findItem()
  }
  if (item.provider?.id !== orgId) {
    test.info().annotations.push({ type: 'note', description: `auto-assignment routed ${item.itemNumber} to ${item.provider?.id ?? 'nobody'}; assigned by admin instead` })
    const route = item.provider ? 'reassign-provider' : 'assign-provider'
    await api(ctx, 'POST', `/api/admin/service-items/${item.id}/${route}`, { providerOrganizationId: orgId, reason: 'E2E acceptance', autoAssignExecutor: false }, admin)
  }

  // It shows up in Incoming by polling (no reload needed).
  await page.goto('/incoming')
  await expect(page.getByText(item.itemNumber)).toBeVisible({ timeout: 45_000 })

  // A technician with the cooling skill, so the picker has an eligible candidate.
  await page.goto('/team?tab=technicians')
  await page.getByRole('button', { name: 'إضافة فني' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('الاسم الكامل').fill('فني تكييف')
  await dialog.locator('input[type=tel]').fill(`0${TECH_COOLING}`)
  await dialog.locator('[role=checkbox], button').filter({ hasText: COOLING }).first().click()
  await dialog.locator('button[type=submit]').click()
  await expect(dialog.getByText('تمت إضافة الفني')).toBeVisible()
  await closeDialogs(page)

  // The candidate picker: ranked, best first, ineligible rows with reasons.
  await page.goto('/incoming')
  const pick = page.getByRole('button', { name: 'اختيار فني' })
  // The smallest block holding both the item number and its own buttons: that item's card.
  const card = page.locator('main').locator('div, article, li').filter({ hasText: item.itemNumber }).filter({ has: pick }).last()
  await card.getByRole('button', { name: 'اختيار فني' }).click()
  const picker = page.getByRole('dialog')
  await expect(picker.getByText('الأنسب', { exact: true })).toBeVisible()
  await expect(picker.getByText('قدرات ناقصة', { exact: true })).toBeVisible()
  await picker.locator('button[type=submit]').click()
  await toast(page, /تم إسناد الخدمة للفني/)

  // Awaiting the technician; the customer's phone stays hidden.
  await page.goto(`/work/${item.id}`)
  await expect(page.getByText('بانتظار قبول الفني').first()).toBeVisible()
  await expect(page.getByText('تظهر بيانات العميل بعد قبول الفني')).toBeVisible()
  await expect(page.locator('main a[href^="tel:+966' + CUSTOMER + '"]')).toHaveCount(0)

  // The technician accepts in the technician app → the phone appears.
  const tech = await otpToken(ctx, e164(TECH_COOLING), 'staff')
  await api(ctx, 'POST', `/api/executor/jobs/${item.id}/accept`, {}, tech)
  await page.reload()
  await expect(page.getByText('قبلها الفني').first()).toBeVisible()
  await expect(page.locator(`main a[href="tel:+966${CUSTOMER}"]`).first()).toBeVisible()

  // Scheduling: the past is refused inline, a future window moves it to Scheduled.
  await page.getByRole('button', { name: /^(جدولة|تغيير الموعد)$/ }).first().click()
  const schedule = page.getByRole('dialog')
  const [from, to] = [schedule.locator('input[type="datetime-local"]').nth(0), schedule.locator('input[type="datetime-local"]').nth(1)]
  await from.fill('2020-01-01T10:00')
  await to.fill('2020-01-01T12:00')
  // Refused inline before anything is sent: the message shows and submitting is blocked.
  await expect(schedule.getByText('لا يمكن اختيار وقت في الماضي')).toBeVisible()
  await expect(schedule.locator('button[type=submit]')).toBeDisabled()
  const day = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10)
  await from.fill(`${day}T10:00`)
  await to.fill(`${day}T12:00`)
  await schedule.locator('button[type=submit]').click()
  await toast(page, 'تم حفظ الموعد وإبلاغ الفني والعميل')
  await expect(page.getByText('مجدولة').first()).toBeVisible()
})
