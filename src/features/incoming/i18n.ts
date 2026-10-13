import { registerTranslations } from '@/i18n'

const ar = {
  title: 'الطلبات الواردة',
  description: 'خدمات أسندتها المنصة لمنشأتك — اختر لكل منها فنيًا. اختيار الفني هو قبولك للطلب.',
  count: '{{count}} بانتظار فني',
  refreshHint: 'تتحدّث تلقائيًا كل 30 ثانية',
  empty: 'لا توجد طلبات بانتظار فني',
  emptyHint: 'ستظهر هنا الطلبات الجديدة فور إسنادها لمنشأتك.',
  goWork: 'عرض الأعمال',
  declinedTag: 'اعتذر الفني',
  marketplace: 'مناقصة',
  delegated: 'مفوَّض للمنصة',
  waiting: 'منذ {{age}}',
  window: 'الموعد المفضّل',
  noWindow: 'بدون موعد محدد',
  devices_zero: 'بدون أجهزة',
  devices: 'الأجهزة: {{count}}',
  details: 'التفاصيل',
  alerts: {
    on: 'التنبيهات مفعّلة',
    off: 'تفعيل تنبيهات سطح المكتب',
    enabled: 'سيصلك تنبيه وصوت عند وصول طلب جديد',
    disabled: 'تم إيقاف تنبيهات سطح المكتب',
    denied: 'المتصفح يمنع التنبيهات — اسمح بها من إعدادات الموقع',
    hint: 'تنبيه وصوت عند وصول طلب جديد',
  },
}

const en: typeof ar = {
  title: 'Incoming',
  description: 'Services the platform assigned to your organization — pick a technician for each. Picking a technician is your acceptance.',
  count: '{{count}} waiting for a technician',
  refreshHint: 'Refreshes every 30 seconds',
  empty: 'Nothing is waiting for a technician',
  emptyHint: 'New requests appear here as soon as they are assigned to your organization.',
  goWork: 'Open Work',
  declinedTag: 'Technician declined',
  marketplace: 'Tender',
  delegated: 'Delegated to the platform',
  waiting: '{{age}} ago',
  window: 'Preferred window',
  noWindow: 'No preferred time',
  devices_zero: 'No devices',
  devices: 'Devices: {{count}}',
  details: 'Details',
  alerts: {
    on: 'Alerts on',
    off: 'Turn on desktop alerts',
    enabled: 'You will get an alert and a sound for new requests',
    disabled: 'Desktop alerts turned off',
    denied: 'The browser blocks notifications — allow them in the site settings',
    hint: 'Alert and sound when a new request arrives',
  },
}

registerTranslations('incoming', { ar, en })
