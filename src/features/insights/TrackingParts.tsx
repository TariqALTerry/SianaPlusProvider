import { ArrowDown, ArrowUp, Info, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { TrackingItemRef } from '@/api/types'
import { Card } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { Th } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import type { Delta } from './trackingLogic'
import './trackingI18n'

/**
 * Pieces shared by the tracking pages: KPI tiles with a change chip, a help popover, sortable headers and the
 * link to a service.
 */

export function KpiTile({
  icon,
  label,
  value,
  sub,
  delta,
  className,
}: {
  icon?: ReactNode
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  delta?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-1 px-4 py-3', className)}>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon && (
          <span className="text-primary [&_svg]:size-4" aria-hidden>
            {icon}
          </span>
        )}
        {label}
      </span>
      {/* Proportional figures at display size; tabular digits are for columns. */}
      <span className="text-2xl font-semibold leading-tight">{value}</span>
      {(sub || delta) && (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {delta}
          {sub && <span className="min-w-0">{sub}</span>}
        </span>
      )}
    </Card>
  )
}

const deltaClass = {
  good: 'bg-tone-success-soft text-tone-success',
  bad: 'bg-tone-danger-soft text-tone-danger',
  neutral: 'bg-muted text-muted-foreground',
} as const

/**
 * The change against the previous period: an arrow for the direction, colour for whether that is good
 * (lower lateness is better), and the text spelled out for screen readers.
 */
export function DeltaChip({ delta, text, label }: { delta: Delta | null; text: string; label: string }) {
  if (!delta) return null
  const Icon = delta.direction === 'up' ? ArrowUp : delta.direction === 'down' ? ArrowDown : Minus
  return (
    <span className={cn('tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold', deltaClass[delta.tone])} title={label} aria-label={label}>
      <Icon className="size-3" aria-hidden />
      {/* "+3" and "−5 د" keep their sign before the number in Arabic too. */}
      <span dir="ltr">{text}</span>
    </span>
  )
}

/** A small "how is this counted" popover next to a title. */
export function HelpPopover({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground', className)}
          aria-label={label}
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] space-y-2 text-sm leading-relaxed">{children}</PopoverContent>
    </Popover>
  )
}

/** A column header that sorts its table; numeric columns align to the end. */
export function SortTh<K extends string>({
  column,
  label,
  sort,
  onSort,
  numeric,
  className,
}: {
  column: K
  label: string
  sort: { key: K; dir: 'asc' | 'desc' }
  onSort: (key: K) => void
  numeric?: boolean
  className?: string
}) {
  const { t } = useTranslation('tracking')
  const active = sort.key === column
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th className={cn(numeric && 'text-end', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={cn('inline-flex items-center gap-1 hover:text-foreground', numeric && 'flex-row-reverse', active && 'text-foreground')}
        onClick={() => onSort(column)}
        aria-label={t('sortBy', { column: label })}
      >
        {label}
        {active && <Arrow className="size-3" />}
      </button>
    </Th>
  )
}

/** The service behind a number: its name links to the work item, with the human number under it. */
export function ServiceLink({ item, className }: { item: TrackingItemRef; className?: string }) {
  const { pick } = useLang()
  return (
    <div className={cn('min-w-0', className)}>
      <Link to={`/work/${item.serviceItemId}`} className="font-medium hover:text-primary hover:underline">
        {pick(item.serviceNameAr, item.serviceNameEn)}
      </Link>
      {/* An inline isolate: a block with direction ltr would also flip its alignment to the left. */}
      {item.itemNumber && (
        <div className="text-xs text-muted-foreground">
          <span className="ltr-nums font-mono">{item.itemNumber}</span>
        </div>
      )}
    </div>
  )
}
