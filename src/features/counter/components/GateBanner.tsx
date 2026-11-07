import { CreditCard, Lock, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useRoleKind } from '@/features/auth/authStore'
import { cn } from '@/lib/utils'
import { isSubscriptionReason, type GateReason } from '../logic'
import '../i18n'

/**
 * Why "استلام جديد" is not offered, with the way out: the subscription page for a subscription reason, the branch
 * settings (owner) for a branch reason, or "ask the owner" for a front-desk account. Devices already received are
 * never locked (phase 3 §2), and the banner says so.
 */
export function GateBanner({ reason, message, className }: { reason: GateReason; message?: string | null; className?: string }) {
  const { t } = useTranslation('counter')
  const role = useRoleKind()
  const subscription = isSubscriptionReason(reason)
  const tone = reason === 'CounterSubscriptionExpired' || reason === 'CounterSubscriptionPendingPayment' ? 'danger' : 'waiting'

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        tone === 'danger' ? 'border-tone-danger/30 bg-tone-danger-soft text-tone-danger' : 'border-tone-waiting/30 bg-tone-waiting-soft text-tone-waiting',
        className,
      )}
    >
      <div className="flex items-start gap-2 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{message || t(`gate.${reason}`)}</p>
          <p className="text-xs opacity-90">{t('gate.existing')}</p>
        </div>
      </div>
      {role === 'frontDesk' ? (
        <p className="text-xs font-medium">{t('gate.askOwner')}</p>
      ) : subscription ? (
        <Button asChild size="lg" className="shrink-0">
          <Link to="/subscription">
            <CreditCard /> {t('gate.toSubscription')}
          </Link>
        </Button>
      ) : reason !== 'NoBranch' && role === 'owner' ? (
        <Button asChild size="lg" variant="outline" className="shrink-0">
          <Link to="/organization?tab=branches">
            <Settings /> {t('gate.toBranches')}
          </Link>
        </Button>
      ) : role === 'supervisor' ? (
        <p className="text-xs font-medium">{t('gate.askOwner')}</p>
      ) : null}
    </div>
  )
}
