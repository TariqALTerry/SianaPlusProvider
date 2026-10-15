import { registerTranslations } from '@/i18n'

/** PROVIDER-PLATFORM-PHASE2-PROMPT §8 (namespace `push`). */
registerTranslations('push', {
  ar: {
    browser: {
      title: 'إشعارات هذا المتصفح',
      description: 'تصلك الطلبات الجديدة والرسائل وتحديثات الخدمات فورًا حتى لو كانت المنصة في الخلفية. قد يظهر نص الإشعار على شاشة جهازك.',
      enable: 'تفعيل',
      disable: 'إيقاف',
      enabled: 'مفعّلة على هذا المتصفح',
      disabled: 'غير مفعّلة',
      blocked: 'الإشعارات محظورة من المتصفح. فعّلها من رمز القفل بجانب الرابط ثم أعد تحميل الصفحة.',
      unsupported: 'متصفحك لا يدعم الإشعارات',
      registeredOn: 'مسجّلة على {{count}} متصفح',
      enableFailed: 'تعذّر تفعيل الإشعارات على هذا المتصفح. حاول مرة أخرى.',
      denied: 'لم تُمنح الموافقة على الإشعارات.',
    },
    prompt: { text: 'فعّل الإشعارات لتصلك الطلبات الجديدة فورًا', enable: 'تفعيل', later: 'لاحقًا' },
    toast: { open: 'فتح' },
  },
  en: {
    browser: {
      title: 'Notifications in this browser',
      description: 'New orders, messages and service updates reach you at once, even with the platform in the background. The notification text may show on your screen.',
      enable: 'Enable',
      disable: 'Turn off',
      enabled: 'On in this browser',
      disabled: 'Off',
      blocked: 'Notifications are blocked by the browser. Allow them from the lock icon next to the address, then reload.',
      unsupported: 'Your browser does not support notifications',
      registeredOn: 'Registered on {{count}} browsers',
      enableFailed: 'Could not enable notifications in this browser. Try again.',
      denied: 'Notification permission was not granted.',
    },
    prompt: { text: 'Enable notifications to get new orders instantly', enable: 'Enable', later: 'Later' },
    toast: { open: 'Open' },
  },
})
