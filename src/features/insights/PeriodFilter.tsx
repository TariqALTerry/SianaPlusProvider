import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DateRangeFilter } from '@/components/Filters'
import { cn } from '@/lib/utils'
import { PERF_PERIODS, type PerfPeriod } from './logic'
import './i18n'

interface PeriodFilterProps {
  period: PerfPeriod
  /** The resolved days, shown beside the tabs. */
  range: { from: string; to: string }
  /** The URL's own `from` and `to`, which only the custom period uses. */
  custom: { from: string; to: string }
  onChange: (patch: { period?: string; from?: string; to?: string }) => void
  children?: ReactNode
}

/** Period tabs of the performance page and the technician report, bound to the URL by the page. */
export function PeriodFilter({ period, range, custom, onChange, children }: PeriodFilterProps) {
  const { t } = useTranslation('insights')
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <div role="tablist" className="flex flex-wrap gap-1">
        {PERF_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => onChange(p === 'custom' ? { period: p, from: range.from, to: range.to } : { period: p, from: '', to: '' })}
            className={cn('rounded-full border px-3 py-1 text-xs', period === p ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {t(`perf.period.${p}`)}
          </button>
        ))}
      </div>
      {period === 'custom' && <DateRangeFilter from={custom.from} to={custom.to} onChange={(r) => onChange(r)} />}
      {range.from && range.to && <span className="tabular text-xs text-muted-foreground">{t('perf.range', { from: range.from, to: range.to })}</span>}
      {children}
    </div>
  )
}
