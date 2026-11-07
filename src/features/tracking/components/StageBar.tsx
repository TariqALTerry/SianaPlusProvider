import { Ban, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RepairOutcome, TrackingStage } from '@/api/types'
import { cn } from '@/lib/utils'
import { stepper } from '../logic'
import '../i18n'

/** The stage bar: shaded up to the current stage; a grey "cancelled" bar on its own. */
export function StageBar({ stage, repairOutcome }: { stage: TrackingStage; repairOutcome: RepairOutcome | null }) {
  const { t } = useTranslation('publicTracking')
  const bar = stepper(stage, repairOutcome)

  if (bar.kind === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground" role="status">
        <Ban className="size-4" aria-hidden /> {t('cancelled')}
      </div>
    )
  }

  const current = bar.steps.find((s) => s.state === 'current') ?? bar.steps[bar.steps.length - 1]!
  return (
    <div>
      <ol className="flex items-start" aria-label={t('title')}>
        {bar.steps.map((s, i) => (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={s.state === 'current' ? 'step' : undefined}>
            {i > 0 && (
              <span aria-hidden className={cn('absolute end-1/2 top-3.5 h-0.5 w-full', s.state === 'todo' ? 'bg-border' : 'bg-primary')} />
            )}
            <span
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold',
                s.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                s.state === 'current' && (s.key === 'NotRepairable' ? 'border-tone-attention bg-tone-attention text-white' : 'border-primary bg-surface text-primary ring-4 ring-primary/15'),
                s.state === 'todo' && 'border-border bg-surface text-muted-foreground',
              )}
            >
              {s.state === 'done' ? <Check className="size-4" aria-hidden /> : <span className="tabular">{i + 1}</span>}
            </span>
            <span className={cn('mt-1.5 px-0.5 text-[0.6875rem] leading-tight', s.state === 'todo' ? 'text-muted-foreground' : 'font-medium')}>{t(`steps.${s.key}`)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-base font-semibold" role="status">
        {current.key === 'NotRepairable' ? t('notRepairableNote') : t(`steps.${current.key}`)}
      </p>
    </div>
  )
}
