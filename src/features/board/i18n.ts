import { registerTranslations } from '@/i18n'

const ar = {
  title: 'لوحة التشغيل',
  description: 'مواعيد اليوم لكل فني وحمل الفريق الآن',
  generatedAt: 'آخر تحديث {{time}} — تتحدّث كل دقيقة',
  kpi: {
    incoming: 'بانتظار فني',
    active: 'الأعمال الجارية',
    capacity: 'من سعة {{capacity}}',
    today: 'مواعيد اليوم',
  },
  timeline: {
    title: 'جدول اليوم',
    unassigned: 'بدون فني',
    empty: 'لا توجد مواعيد اليوم',
    now: 'الآن',
    noItems: '—',
  },
  executors: {
    title: 'الفنيون',
    empty: 'لا يوجد فنيون في فريقك بعد',
    inactive: 'غير نشط',
    load: 'الحمل',
    items: 'أعماله',
    manageTeam: 'إدارة الفريق',
  },
}

const en: typeof ar = {
  title: 'Operations board',
  description: 'Today’s appointments per technician, and the team’s load right now',
  generatedAt: 'Updated {{time}} — refreshes every minute',
  kpi: {
    incoming: 'Waiting for a technician',
    active: 'Active work',
    capacity: 'of {{capacity}} capacity',
    today: 'Today’s appointments',
  },
  timeline: {
    title: 'Today’s schedule',
    unassigned: 'No technician',
    empty: 'No appointments today',
    now: 'Now',
    noItems: '—',
  },
  executors: {
    title: 'Technicians',
    empty: 'Your team has no technicians yet',
    inactive: 'Inactive',
    load: 'Load',
    items: 'Their work',
    manageTeam: 'Manage team',
  },
}

registerTranslations('board', { ar, en })
