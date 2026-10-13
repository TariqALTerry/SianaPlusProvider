import { Eye } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { maskPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'

/**
 * Phone numbers are personal data (§15): `masked` in lists (with a reveal button), full with a
 * `tel:` link on detail pages.
 */
export function PhoneText({ phone, masked = false, className }: { phone: string | null | undefined; masked?: boolean; className?: string }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  if (!phone) return <span className="text-muted-foreground">—</span>

  if (masked && !revealed) {
    const reveal = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setRevealed(true)
    }
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span className="ltr-nums tabular whitespace-nowrap">{maskPhone(phone)}</span>
        <button type="button" onClick={reveal} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('actions.show')} title={t('actions.show')}>
          <Eye className="size-3.5" />
        </button>
      </span>
    )
  }

  return (
    <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className={cn('ltr-nums tabular whitespace-nowrap text-primary hover:underline', className)}>
      {phone}
    </a>
  )
}
