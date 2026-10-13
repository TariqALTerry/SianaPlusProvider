import { Apple, Phone, Play, ShieldAlert, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EXECUTOR_APP_ANDROID_URL, EXECUTOR_APP_IOS_URL, SUPPORT_PHONE } from '@/lib/env'
import { cn } from '@/lib/utils'
import type { LogoutNotice } from './authStore'

/** Why the user is on the sign-in screen, with the next step (§4, §5.1). */
export function SignInNotice({ notice, className }: { notice: Exclude<LogoutNotice, null>; className?: string }) {
  const { t } = useTranslation()

  const text: Record<typeof notice, string> = {
    expired: t('auth.sessionExpired'),
    idle: t('auth.idleLoggedOut'),
    blocked: t('auth.accountSuspended'),
    tenant: t('auth.tenantSuspended'),
    missing: t('auth.tenantMissing'),
    executor: t('auth.executorRefused'),
    notProvider: t('auth.notProvider'),
  }
  const severe = notice === 'blocked' || notice === 'tenant' || notice === 'missing' || notice === 'notProvider'
  const Icon = notice === 'executor' ? Smartphone : ShieldAlert

  return (
    <div
      role={severe ? 'alert' : 'status'}
      className={cn(
        'space-y-2 rounded-lg border px-3 py-2.5 text-sm',
        severe ? 'border-tone-danger/30 bg-tone-danger-soft text-tone-danger' : 'border-tone-waiting/30 bg-tone-waiting-soft text-tone-waiting',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="font-medium">{text[notice]}</p>
      </div>

      {notice === 'executor' && (EXECUTOR_APP_IOS_URL || EXECUTOR_APP_ANDROID_URL) && (
        <div className="flex flex-wrap gap-2 ps-6">
          {EXECUTOR_APP_IOS_URL && (
            <a href={EXECUTOR_APP_IOS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Apple className="size-3.5" /> {t('auth.appStore')}
            </a>
          )}
          {EXECUTOR_APP_ANDROID_URL && (
            <a href={EXECUTOR_APP_ANDROID_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
              <Play className="size-3.5" /> {t('auth.googlePlay')}
            </a>
          )}
        </div>
      )}

      {(notice === 'tenant' || notice === 'blocked' || notice === 'missing') && SUPPORT_PHONE && (
        <a href={`tel:${SUPPORT_PHONE}`} className="ms-6 inline-flex items-center gap-1.5 text-xs font-medium underline">
          <Phone className="size-3.5" />
          <span className="ltr-nums">{t('auth.supportPhone', { phone: SUPPORT_PHONE })}</span>
        </a>
      )}
    </div>
  )
}
