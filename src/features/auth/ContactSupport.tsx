import { LifeBuoy, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { SUPPORT_PHONE } from '@/lib/env'

/**
 * `PhoneLinkedToMultipleAccounts` (§5.1): the phone alone can't pick an account, so sign-in can't
 * continue. Points to support (a call button when `VITE_SUPPORT_PHONE` is set) or another number.
 */
export function ContactSupport({ onUseAnotherNumber }: { onUseAnotherNumber: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-tone-attention/30 bg-tone-attention-soft px-4 py-3 text-sm text-tone-attention">
      <div className="flex items-start gap-2">
        <LifeBuoy className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">{t('auth.multipleAccountsTitle')}</p>
          <p className="leading-relaxed">{t('auth.multipleAccountsBody')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 ps-7">
        {SUPPORT_PHONE ? (
          <Button asChild size="sm">
            <a href={`tel:${SUPPORT_PHONE}`}>
              <Phone /> {t('auth.callSupport')} <bdi className="ltr-nums font-latin tabular">{SUPPORT_PHONE}</bdi>
            </a>
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Phone className="size-4" /> {t('auth.contactSupport')}
          </span>
        )}
        <Button type="button" size="sm" variant="outline" className="bg-surface" onClick={onUseAnotherNumber}>
          {t('auth.useAnotherNumber')}
        </Button>
      </div>
    </div>
  )
}
