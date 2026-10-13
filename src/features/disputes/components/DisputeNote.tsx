import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import '../i18n'

/** "تتولى المنصة معالجة الشكاوى" — the page is read-only for the organization. */
export function DisputeNote({ className }: { className?: string }) {
  const { t } = useTranslation('disputes')
  return (
    <p className={cn('flex items-center gap-2 rounded-md border border-tone-info/20 bg-tone-info-soft px-3 py-2 text-sm', className)}>
      <ShieldCheck className="size-4 shrink-0 text-tone-info" aria-hidden />
      {t('note')}
    </p>
  )
}
