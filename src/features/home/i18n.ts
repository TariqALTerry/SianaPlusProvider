import { registerTranslations } from '@/i18n'

const ar = {
  greeting: 'أهلًا، {{name}}',
  subtitle: 'هذه نظرة سريعة على أعمال منشأتك اليوم',
  pendingCta_zero: 'لا توجد طلبات بانتظار فني',
  pendingCta: 'طلبات بانتظار فني: {{count}}',
  openIncoming: 'افتح الطلبات الواردة',
  live: 'تتحدّث كل دقيقة',
  kpi: {
    pending: 'طلبات بانتظار فني',
    active: 'الأعمال الجارية',
    activeOf: 'من سعة {{capacity}}',
    noCapacity: 'لم تُحدَّد السعة',
    today: 'مواعيد اليوم',
    executors: 'الفنيون النشطون',
    rating: 'التقييم',
    ratingsCount: '{{count}} تقييم',
    noRatings: 'لا توجد تقييمات بعد',
    completed: 'خدمات مكتملة',
  },
  distribution: {
    title: 'توزيع الأعمال الجارية',
    hint: 'اضغط على أي حالة لعرض أعمالها',
    empty: 'لا توجد أعمال جارية الآن',
  },
  today: {
    title: 'اليوم',
    viewBoard: 'لوحة التشغيل',
    empty: 'لا توجد مواعيد اليوم',
    unassigned: 'بدون فني',
  },
}

const en: typeof ar = {
  greeting: 'Welcome, {{name}}',
  subtitle: 'A quick look at your organization’s work today',
  pendingCta_zero: 'Nothing is waiting for a technician',
  pendingCta: 'Waiting for a technician: {{count}}',
  openIncoming: 'Open Incoming',
  live: 'Refreshes every minute',
  kpi: {
    pending: 'Waiting for a technician',
    active: 'Active work',
    activeOf: 'of {{capacity}} capacity',
    noCapacity: 'Capacity not set',
    today: 'Today’s appointments',
    executors: 'Active technicians',
    rating: 'Rating',
    ratingsCount: '{{count}} ratings',
    noRatings: 'No ratings yet',
    completed: 'Completed services',
  },
  distribution: {
    title: 'Active work by status',
    hint: 'Click a status to see its work',
    empty: 'No active work right now',
  },
  today: {
    title: 'Today',
    viewBoard: 'Operations board',
    empty: 'No appointments today',
    unassigned: 'No technician',
  },
}

registerTranslations('home', { ar, en })
