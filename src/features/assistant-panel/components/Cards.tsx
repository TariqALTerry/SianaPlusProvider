import { ArrowUpLeft, ChevronLeft, CircleCheck, CircleDot, CircleSlash, Circle, Lightbulb, AlertTriangle, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  StaffAssistantBriefResponse,
  StaffAssistantCard,
  StaffAssistantEntity,
  StaffAssistantKpi,
  StaffAssistantStep,
  StaffAssistantTable,
} from '@/api/types'
import { DateTime, Money, Num } from '@/components/Format'
import { useLang } from '@/hooks/useLang'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isSafeRoute } from '../context'

const toneText: Record<string, string> = {
  good: 'text-tone-success',
  warning: 'text-tone-waiting',
  bad: 'text-tone-danger',
}

const toneRing: Record<string, string> = {
  good: 'border-tone-success/30 bg-tone-success-soft/60',
  warning: 'border-tone-waiting/30 bg-tone-waiting-soft/60',
  bad: 'border-tone-danger/30 bg-tone-danger-soft/60',
}

/** One value as the card's column says: money, a count, a percentage (0–100), a date, or text. */
export function CardValue({ value, format }: { value: unknown; format: string }) {
  const { lang } = useLang()
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  const n = typeof value === 'number' ? value : Number(value)
  switch (format) {
    case 'money':
      return Number.isFinite(n) ? <Money value={n} /> : <span>{String(value)}</span>
    case 'count':
      return Number.isFinite(n) ? <Num value={n} /> : <span>{String(value)}</span>
    case 'percent':
      return <span className="tabular">{Number.isFinite(n) ? formatPercent(n / 100, lang) : String(value)}</span>
    case 'date':
      return <DateTime value={String(value)} mode="date" />
    case 'datetime':
      return <DateTime value={String(value)} mode="absolute" />
    case 'status':
      return <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{String(value)}</span>
    default:
      return <span>{String(value)}</span>
  }
}

function Shell({ title, period, children, className }: { title?: string | null; period?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-surface shadow-sm', className)}>
      {(title || period) && (
        <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-l from-primary-soft/70 to-transparent px-3 py-2 dark:from-primary/10">
          {title && <div className="truncate text-xs font-semibold text-foreground">{title}</div>}
          {period && <div className="shrink-0 font-mono text-[10px] text-muted-foreground ltr-nums">{period}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

function KpiTile({ kpi }: { kpi: StaffAssistantKpi }) {
  const isText = kpi.format === 'text' || kpi.value === null
  return (
    <div className={cn('rounded-lg border px-3 py-2', kpi.tone ? toneRing[kpi.tone] : 'bg-muted/30')}>
      <div className="truncate text-[11px] text-muted-foreground">{kpi.label}</div>
      <div className={cn('mt-0.5 text-base font-semibold leading-tight', kpi.tone && toneText[kpi.tone])}>
        {isText ? kpi.text ?? '—' : <CardValue value={kpi.value} format={kpi.format} />}
      </div>
      {kpi.hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{kpi.hint}</div>}
    </div>
  )
}

export function KpisCard({ title, period, kpis }: { title?: string | null; period?: string | null; kpis: readonly StaffAssistantKpi[] }) {
  return (
    <Shell title={title} period={period}>
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {kpis.map((kpi, i) => (
          <KpiTile key={i} kpi={kpi} />
        ))}
      </div>
    </Shell>
  )
}

export function TableCard({ title, table, onNavigate }: { title?: string | null; table: StaffAssistantTable; onNavigate: (route: string) => void }) {
  const { t } = useTranslation('assistantPanel')
  const rows = table.rows
  return (
    <Shell title={title}>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">—</div>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface/95 backdrop-blur">
              <tr className="border-b">
                {table.columns.map((c) => (
                  <th key={c.key} className={cn('whitespace-nowrap px-2.5 py-1.5 text-start font-medium text-muted-foreground', ['money', 'count', 'percent'].includes(c.format) && 'text-end')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const route = row._route as string | undefined
                const clickable = isSafeRoute(route)
                return (
                  <tr
                    key={i}
                    className={cn('border-b last:border-0', clickable && 'cursor-pointer transition-colors hover:bg-primary-soft/40')}
                    onClick={clickable ? () => onNavigate(route!) : undefined}
                  >
                    {table.columns.map((c) => (
                      <td key={c.key} className={cn('max-w-[11rem] truncate px-2.5 py-1.5', ['money', 'count', 'percent'].includes(c.format) && 'text-end')}>
                        <CardValue value={row[c.key]} format={c.format} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {(table.total > rows.length || table.viewAllRoute) && (
        <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>{table.total > rows.length ? t('rowsShown', { shown: rows.length, total: table.total }) : null}</span>
          {isSafeRoute(table.viewAllRoute) && (
            <button type="button" className="inline-flex items-center gap-1 font-medium text-primary hover:underline" onClick={() => onNavigate(table.viewAllRoute!)}>
              {t('viewAll', { count: table.total })}
              <ChevronLeft className="size-3 ltr:rotate-180" />
            </button>
          )}
        </div>
      )}
    </Shell>
  )
}

export function EntityCard({ entity, onNavigate }: { entity: StaffAssistantEntity; onNavigate: (route: string) => void }) {
  const { t } = useTranslation('assistantPanel')
  return (
    <Shell>
      <div className="flex items-start justify-between gap-3 px-3 pt-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-semibold ltr-nums">{entity.title}</div>
          {entity.subtitle && <div className="truncate text-xs text-muted-foreground">{entity.subtitle}</div>}
        </div>
        {entity.statusText || entity.status ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">{entity.statusText ?? entity.status}</span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3">
        {entity.fields.map((f, i) => (
          <div key={i} className="min-w-0">
            <dt className="truncate text-[10px] text-muted-foreground">{f.label}</dt>
            <dd className="truncate text-xs font-medium">
              <CardValue value={f.number ?? f.value} format={f.format} />
            </dd>
          </div>
        ))}
      </dl>
      {isSafeRoute(entity.route) && (
        <button
          type="button"
          onClick={() => onNavigate(entity.route!)}
          className="flex w-full items-center justify-center gap-1.5 border-t bg-muted/20 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft/40"
        >
          {t('open')}
          <ArrowUpLeft className="size-3.5 ltr:-scale-x-100" />
        </button>
      )}
    </Shell>
  )
}

const stepIcon = {
  done: <CircleCheck className="size-4 text-tone-success" />,
  current: <CircleDot className="size-4 animate-pulse text-primary" />,
  blocked: <CircleSlash className="size-4 text-tone-danger" />,
  todo: <Circle className="size-4 text-muted-foreground/60" />,
} as const

export function StepsCard({ title, steps }: { title?: string | null; steps: readonly StaffAssistantStep[] }) {
  const { t } = useTranslation('assistantPanel')
  return (
    <Shell title={title}>
      <ol className="space-y-1.5 p-3">
        {steps.map((s, i) => {
          const state = (s.state in stepIcon ? s.state : 'todo') as keyof typeof stepIcon
          return (
            <li key={i} className="flex items-center gap-2 text-xs">
              {stepIcon[state]}
              <span className={cn('flex-1', state === 'current' && 'font-semibold', state === 'todo' && 'text-muted-foreground')}>{s.label}</span>
              <span className="text-[10px] text-muted-foreground">{t(`steps.${state}`)}</span>
            </li>
          )
        })}
      </ol>
    </Shell>
  )
}

const severityStyle = {
  critical: { icon: AlertTriangle, box: 'border-tone-danger/30 bg-tone-danger-soft/50', text: 'text-tone-danger' },
  warning: { icon: Lightbulb, box: 'border-tone-waiting/30 bg-tone-waiting-soft/50', text: 'text-tone-waiting' },
  info: { icon: Info, box: 'border-border bg-muted/30', text: 'text-tone-info' },
} as const

export function BriefCard({ brief, onAsk, onNavigate }: { brief: StaffAssistantBriefResponse; onAsk: (q: string) => void; onNavigate: (route: string) => void }) {
  const { t } = useTranslation('assistantPanel')
  return (
    <Shell title={`${t('brief.title')} · ${brief.greeting}`}>
      <div className="space-y-1.5 p-2.5">
        {brief.items.length === 0 && <div className="py-2 text-center text-xs text-muted-foreground">{t('brief.empty')}</div>}
        {brief.items.map((item) => {
          const style = severityStyle[(item.severity as keyof typeof severityStyle) ?? 'info'] ?? severityStyle.info
          const Icon = style.icon
          return (
            <div key={item.key} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-2', style.box)}>
              <Icon className={cn('size-4 shrink-0', style.text)} />
              <span className="min-w-0 flex-1 text-xs leading-snug">{item.text}</span>
              {item.question && (
                <button type="button" onClick={() => onAsk(item.question!)} className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-primary shadow-sm ring-1 ring-border hover:bg-primary-soft">
                  {t('brief.ask')}
                </button>
              )}
              {isSafeRoute(item.route) && (
                <button type="button" onClick={() => onNavigate(item.route!)} className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground" aria-label={t('brief.openPage')}>
                  <ArrowUpLeft className="size-3.5 ltr:-scale-x-100" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Shell>
  )
}

/** A card under the assistant's reply (the confirmation card is rendered by the caller). */
export function AssistantCardView({ card, onNavigate, onAsk }: { card: StaffAssistantCard; onNavigate: (route: string) => void; onAsk: (q: string) => void }) {
  switch (card.type) {
    case 'kpis':
      return card.kpis ? <KpisCard title={card.title} period={card.period} kpis={card.kpis} /> : null
    case 'table':
      return card.table ? <TableCard title={card.title} table={card.table} onNavigate={onNavigate} /> : null
    case 'entity':
      return card.entity ? <EntityCard entity={card.entity} onNavigate={onNavigate} /> : null
    case 'steps':
      return card.steps ? <StepsCard title={card.title} steps={card.steps} /> : null
    case 'brief':
      return card.brief ? <BriefCard brief={card.brief} onAsk={onAsk} onNavigate={onNavigate} /> : null
    default:
      return null
  }
}
