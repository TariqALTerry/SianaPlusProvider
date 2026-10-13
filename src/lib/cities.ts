/**
 * Suggestions for the free-text `city` fields (≤100 chars on the server). The backend has no city
 * lookup; matching is by the stored string, so suggestions keep spellings consistent. Riyadh first
 * (§5.2). Any other city can still be typed.
 */
export const SAUDI_CITIES: readonly string[] = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الجبيل',
  'القطيف', 'الطائف', 'بريدة', 'عنيزة', 'تبوك', 'أبها', 'خميس مشيط', 'حائل', 'جازان', 'نجران', 'ينبع',
  'الباحة', 'سكاكا', 'عرعر', 'حفر الباطن', 'الخرج',
]
