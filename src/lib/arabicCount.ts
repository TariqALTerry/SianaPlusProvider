/**
 * Arabic number agreement for counted units and nouns ("منذ دقيقتين"، "خلال 7 أيام"، "9 دفعات"، "16 دفعة").
 *
 * The forms follow CLDR's Arabic plural categories (the same ones `Intl.PluralRules('ar')` and i18next use):
 * - 1 → the noun alone for time units ("دقيقة"، "يوم"), the noun with "واحد/واحدة" for counted things ("دفعة واحدة")
 * - 2 → the dual without the number ("دقيقتين"، "دفعتين"، or "دقيقتان"، "دفعتان" with `case: 'nominative'`)
 * - n % 100 in 3–10 → plural ("3 دقائق"، "7 أيام"، "9 دفعات")
 * - n % 100 in 11–99 → singular accusative ("22 دقيقة"، "25 يومًا"، "16 دفعة"، "12 طلبًا")
 * - 0, 100, 101, 102, 200… and fractions → singular ("100 يوم"، "0 دفعة"، "1.5 ساعة")
 *
 * The genitive/accusative dual (‑ين) is the default because almost every use follows a preposition (منذ، خلال، على،
 * من) or a verb ("تم تصدير صفين"). A count shown on its own, or as the subject, takes `case: 'nominative'`
 * ("دفعتان"). Latin digits, as everywhere else in the panel; a number passed as text ("1,234") is shown as it came.
 *
 * In translations use the i18next formatters registered in `@/i18n` (names in `COUNT_FORMATTERS`):
 * `'ينتهي خلال {{count, days}}'`، `'{{count, payments(case: nominative)}}'`. For a noun that is not registered, pass
 * its forms to `countAr` directly; for a whole sentence that has to agree (adjectives, verbs), use `arPlural`.
 */

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export type CountNoun =
  | 'payment' | 'order' | 'technician' | 'service' | 'rating' | 'product' | 'offer' | 'message' | 'claim'
  | 'notification' | 'device' | 'conversation' | 'time' | 'image' | 'report' | 'specialty' | 'view' | 'like'
  | 'comment' | 'branch' | 'area' | 'point' | 'provider' | 'employee' | 'permission' | 'settlement' | 'visit'
  | 'item' | 'field' | 'result' | 'row' | 'browser' | 'document' | 'task' | 'customer' | 'part' | 'facility'
  | 'account' | 'package' | 'address' | 'category' | 'capability' | 'warranty' | 'member' | 'district'
  | 'dispute' | 'refund' | 'quote' | 'ticket'

export type CountUnit = TimeUnit | CountNoun
export type ArabicCase = 'genitive' | 'nominative'

/** The six shapes of a counted Arabic noun. `few` and `many` follow the number; the others stand alone (or `other` follows 0/100). */
export interface ArabicForms {
  /** 1: "دقيقة"، "دفعة واحدة". */
  one: string
  /** 2, genitive/accusative: "دقيقتين"، "دفعتين". */
  two: string
  /** 2, nominative: "دقيقتان"، "دفعتان". */
  twoNom: string
  /** 3–10: "دقائق"، "دفعات". */
  few: string
  /** 11–99: "دقيقة"، "يومًا"، "طلبًا". */
  many: string
  /** 0, 100, 101, 102… and fractions: "يوم"، "دفعة". */
  other: string
}

/** Time units: 1 is the bare noun ("منذ دقيقة"). */
function unit(one: string, two: string, twoNom: string, few: string, many = one): ArabicForms {
  return { one, two, twoNom, few, many, other: one }
}

/** A counted thing: 1 is "<noun> واحد/واحدة" ("دفعة واحدة"، "طلب واحد"). `many` defaults to the singular (feminine in ة). */
function noun(singular: string, gender: 'm' | 'f', two: string, twoNom: string, few: string, many = singular): ArabicForms {
  return { one: `${singular} ${gender === 'f' ? 'واحدة' : 'واحد'}`, two, twoNom, few, many, other: singular }
}

const AR: Record<CountUnit, ArabicForms> = {
  second: unit('ثانية', 'ثانيتين', 'ثانيتان', 'ثوانٍ'),
  minute: unit('دقيقة', 'دقيقتين', 'دقيقتان', 'دقائق'),
  hour: unit('ساعة', 'ساعتين', 'ساعتان', 'ساعات'),
  day: unit('يوم', 'يومين', 'يومان', 'أيام', 'يومًا'),
  week: unit('أسبوع', 'أسبوعين', 'أسبوعان', 'أسابيع', 'أسبوعًا'),
  month: unit('شهر', 'شهرين', 'شهران', 'أشهر', 'شهرًا'),
  year: unit('سنة', 'سنتين', 'سنتان', 'سنوات'),

  payment: noun('دفعة', 'f', 'دفعتين', 'دفعتان', 'دفعات'),
  order: noun('طلب', 'm', 'طلبين', 'طلبان', 'طلبات', 'طلبًا'),
  technician: noun('فني', 'm', 'فنيَّين', 'فنيان', 'فنيين', 'فنيًا'),
  service: noun('خدمة', 'f', 'خدمتين', 'خدمتان', 'خدمات'),
  rating: noun('تقييم', 'm', 'تقييمين', 'تقييمان', 'تقييمات', 'تقييمًا'),
  product: noun('منتج', 'm', 'منتجين', 'منتجان', 'منتجات', 'منتجًا'),
  offer: noun('عرض', 'm', 'عرضين', 'عرضان', 'عروض', 'عرضًا'),
  message: noun('رسالة', 'f', 'رسالتين', 'رسالتان', 'رسائل'),
  claim: noun('مطالبة', 'f', 'مطالبتين', 'مطالبتان', 'مطالبات'),
  notification: noun('إشعار', 'm', 'إشعارين', 'إشعاران', 'إشعارات', 'إشعارًا'),
  device: noun('جهاز', 'm', 'جهازين', 'جهازان', 'أجهزة', 'جهازًا'),
  conversation: noun('محادثة', 'f', 'محادثتين', 'محادثتان', 'محادثات'),
  time: noun('مرة', 'f', 'مرتين', 'مرتان', 'مرات'),
  image: noun('صورة', 'f', 'صورتين', 'صورتان', 'صور'),
  report: noun('بلاغ', 'm', 'بلاغين', 'بلاغان', 'بلاغات', 'بلاغًا'),
  specialty: noun('تخصص', 'm', 'تخصصين', 'تخصصان', 'تخصصات', 'تخصصًا'),
  view: noun('مشاهدة', 'f', 'مشاهدتين', 'مشاهدتان', 'مشاهدات'),
  like: noun('إعجاب', 'm', 'إعجابين', 'إعجابان', 'إعجابات', 'إعجابًا'),
  comment: noun('تعليق', 'm', 'تعليقين', 'تعليقان', 'تعليقات', 'تعليقًا'),
  branch: noun('فرع', 'm', 'فرعين', 'فرعان', 'فروع', 'فرعًا'),
  area: noun('منطقة', 'f', 'منطقتين', 'منطقتان', 'مناطق'),
  point: noun('نقطة', 'f', 'نقطتين', 'نقطتان', 'نقاط'),
  provider: noun('مزود', 'm', 'مزودَين', 'مزودان', 'مزودين', 'مزودًا'),
  employee: noun('موظف', 'm', 'موظفَين', 'موظفان', 'موظفين', 'موظفًا'),
  permission: noun('صلاحية', 'f', 'صلاحيتين', 'صلاحيتان', 'صلاحيات'),
  settlement: noun('تسوية', 'f', 'تسويتين', 'تسويتان', 'تسويات'),
  visit: noun('زيارة', 'f', 'زيارتين', 'زيارتان', 'زيارات'),
  item: noun('بند', 'm', 'بندين', 'بندان', 'بنود', 'بندًا'),
  field: noun('حقل', 'm', 'حقلين', 'حقلان', 'حقول', 'حقلًا'),
  result: noun('نتيجة', 'f', 'نتيجتين', 'نتيجتان', 'نتائج'),
  row: noun('صف', 'm', 'صفين', 'صفان', 'صفوف', 'صفًا'),
  browser: noun('متصفح', 'm', 'متصفحين', 'متصفحان', 'متصفحات', 'متصفحًا'),
  document: noun('وثيقة', 'f', 'وثيقتين', 'وثيقتان', 'وثائق'),
  task: noun('مهمة', 'f', 'مهمتين', 'مهمتان', 'مهام'),
  customer: noun('عميل', 'm', 'عميلين', 'عميلان', 'عملاء', 'عميلًا'),
  part: noun('قطعة', 'f', 'قطعتين', 'قطعتان', 'قطع'),
  facility: noun('منشأة', 'f', 'منشأتين', 'منشأتان', 'منشآت'),
  account: noun('حساب', 'm', 'حسابين', 'حسابان', 'حسابات', 'حسابًا'),
  package: noun('باقة', 'f', 'باقتين', 'باقتان', 'باقات'),
  address: noun('عنوان', 'm', 'عنوانين', 'عنوانان', 'عناوين', 'عنوانًا'),
  category: noun('تصنيف', 'm', 'تصنيفين', 'تصنيفان', 'تصنيفات', 'تصنيفًا'),
  capability: noun('قدرة', 'f', 'قدرتين', 'قدرتان', 'قدرات'),
  warranty: noun('ضمان', 'm', 'ضمانين', 'ضمانان', 'ضمانات', 'ضمانًا'),
  member: noun('عضو', 'm', 'عضوين', 'عضوان', 'أعضاء', 'عضوًا'),
  district: noun('حي', 'm', 'حيين', 'حيان', 'أحياء', 'حيًّا'),
  dispute: noun('نزاع', 'm', 'نزاعين', 'نزاعان', 'نزاعات', 'نزاعًا'),
  refund: noun('استرداد', 'm', 'استردادين', 'استردادان', 'استردادات', 'استردادًا'),
  quote: noun('عرض سعر', 'm', 'عرضي سعر', 'عرضا سعر', 'عروض أسعار', 'عرض سعر'),
  ticket: noun('تذكرة', 'f', 'تذكرتين', 'تذكرتان', 'تذاكر'),
}

const EN: Record<CountUnit, [string, string]> = {
  second: ['second', 'seconds'],
  minute: ['minute', 'minutes'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
  payment: ['payment', 'payments'],
  order: ['order', 'orders'],
  technician: ['technician', 'technicians'],
  service: ['service', 'services'],
  rating: ['rating', 'ratings'],
  product: ['product', 'products'],
  offer: ['offer', 'offers'],
  message: ['message', 'messages'],
  claim: ['claim', 'claims'],
  notification: ['notification', 'notifications'],
  device: ['device', 'devices'],
  conversation: ['conversation', 'conversations'],
  time: ['time', 'times'],
  image: ['image', 'images'],
  report: ['report', 'reports'],
  specialty: ['specialty', 'specialties'],
  view: ['view', 'views'],
  like: ['like', 'likes'],
  comment: ['comment', 'comments'],
  branch: ['branch', 'branches'],
  area: ['area', 'areas'],
  point: ['point', 'points'],
  provider: ['provider', 'providers'],
  employee: ['employee', 'employees'],
  permission: ['permission', 'permissions'],
  settlement: ['settlement', 'settlements'],
  visit: ['visit', 'visits'],
  item: ['item', 'items'],
  field: ['field', 'fields'],
  result: ['result', 'results'],
  row: ['row', 'rows'],
  browser: ['browser', 'browsers'],
  document: ['document', 'documents'],
  task: ['job', 'jobs'],
  customer: ['customer', 'customers'],
  part: ['part', 'parts'],
  facility: ['business', 'businesses'],
  account: ['account', 'accounts'],
  package: ['plan', 'plans'],
  address: ['address', 'addresses'],
  category: ['category', 'categories'],
  capability: ['capability', 'capabilities'],
  warranty: ['warranty', 'warranties'],
  member: ['member', 'members'],
  district: ['district', 'districts'],
  dispute: ['dispute', 'disputes'],
  refund: ['refund', 'refunds'],
  quote: ['quote', 'quotes'],
  ticket: ['ticket', 'tickets'],
}

/** "12" / "1,234" / 12 → 12; anything else → null. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const s = value.trim().replace(/[,،٬\s  ]/g, '')
    if (!/^[-−]?\d+(\.\d+)?$/.test(s)) return null
    return Number(s.replace('−', '-'))
  }
  return null
}

/** The forms the agreement picks for `n` (no number in them). */
function pick(n: number, f: ArabicForms, options: { case?: ArabicCase }): { text: string; withNumber: boolean } {
  const abs = Math.abs(n)
  if (!Number.isInteger(abs)) return { text: f.other, withNumber: true }
  if (abs === 1) return { text: f.one, withNumber: false }
  if (abs === 2) return { text: options.case === 'nominative' ? f.twoNom : f.two, withNumber: false }
  const rest = abs % 100
  if (rest >= 3 && rest <= 10) return { text: f.few, withNumber: true }
  if (rest >= 11 && rest <= 99) return { text: f.many, withNumber: true }
  return { text: f.other, withNumber: true }
}

/**
 * `n` units or things in Arabic with the right agreement: `countAr(2, 'minute')` → "دقيقتين"، `countAr(25, 'day')` →
 * "25 يومًا"، `countAr(9, 'payment')` → "9 دفعات"، `countAr(16, 'payment')` → "16 دفعة"، `countAr(1, 'order')` →
 * "طلب واحد". Any other noun: pass its `ArabicForms`. `shown` replaces the digits in the text ("1,234").
 */
export function countAr(value: number, unit: CountUnit | ArabicForms, options: { case?: ArabicCase; shown?: string } = {}): string {
  const forms = typeof unit === 'string' ? AR[unit] : unit
  const { text, withNumber } = pick(value, forms, options)
  return withNumber ? `${options.shown ?? String(value)} ${text}` : text
}

/** The Arabic forms of a registered unit or noun, for building a sentence around them. */
export function arabicForms(unit: CountUnit): ArabicForms {
  return AR[unit]
}

/** `n` units or things in the UI language. A value that is not a number comes back as it is. */
export function formatCount(value: unknown, unit: CountUnit, language: string, options: { case?: ArabicCase } = {}): string {
  const n = toNumber(value)
  if (n === null) return value === null || value === undefined ? '—' : String(value)
  const shown = typeof value === 'string' ? value.trim() : String(value)
  if (language === 'en') return `${shown} ${Math.abs(n) === 1 ? EN[unit][0] : EN[unit][1]}`
  return countAr(n, unit, { ...options, shown })
}

/**
 * Relative time in Arabic from a signed difference in milliseconds (positive = in the past): "منذ دقيقتين"،
 * "منذ 22 دقيقة"، "بعد 3 أيام". The rounding thresholds are dayjs's, so the switch from minutes to hours, days, months
 * and years lands where the English text switches.
 */
export function relativeAr(diffMs: number): string {
  const past = diffMs >= 0
  const seconds = Math.abs(diffMs) / 1000
  const minutes = seconds / 60
  const hours = minutes / 60
  const days = hours / 24
  let text: string
  if (seconds < 45) text = 'لحظات'
  else if (seconds < 90) text = countAr(1, 'minute')
  else if (minutes < 45) text = countAr(Math.round(minutes), 'minute')
  else if (minutes < 90) text = countAr(1, 'hour')
  else if (hours < 22) text = countAr(Math.round(hours), 'hour')
  else if (hours < 36) text = countAr(1, 'day')
  else if (days < 26) text = countAr(Math.round(days), 'day')
  else if (days < 46) text = countAr(1, 'month')
  else if (days < 320) text = countAr(Math.max(2, Math.round(days / 30.4)), 'month')
  else if (days < 548) text = countAr(1, 'year')
  else text = countAr(Math.max(2, Math.round(days / 365)), 'year')
  return past ? `منذ ${text}` : `بعد ${text}`
}

/** i18next formatter names → unit or noun, registered in `@/i18n` (`{{count, days}}`، `{{count, payments}}`). */
export const COUNT_FORMATTERS: Record<string, CountUnit> = {
  seconds: 'second',
  minutes: 'minute',
  hours: 'hour',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
  payments: 'payment',
  orders: 'order',
  technicians: 'technician',
  services: 'service',
  ratings: 'rating',
  products: 'product',
  offers: 'offer',
  messages: 'message',
  claims: 'claim',
  notifications: 'notification',
  devices: 'device',
  conversations: 'conversation',
  times: 'time',
  images: 'image',
  reports: 'report',
  specialties: 'specialty',
  views: 'view',
  likes: 'like',
  comments: 'comment',
  branches: 'branch',
  areas: 'area',
  points: 'point',
  providers: 'provider',
  employees: 'employee',
  permissions: 'permission',
  settlements: 'settlement',
  visits: 'visit',
  items: 'item',
  fields: 'field',
  results: 'result',
  rows: 'row',
  browsers: 'browser',
  documents: 'document',
  tasks: 'task',
  customers: 'customer',
  parts: 'part',
  facilities: 'facility',
  accounts: 'account',
  packages: 'package',
  addresses: 'address',
  categories: 'category',
  capabilities: 'capability',
  warranties: 'warranty',
  members: 'member',
  districts: 'district',
  disputes: 'dispute',
  refunds: 'refund',
  quotes: 'quote',
  tickets: 'ticket',
}
