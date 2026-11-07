import { useQuery } from '@tanstack/react-query'
import { Archive, Boxes, ClipboardList, PackageCheck, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { CounterDefectRate, CounterPartsReport, CounterReportResponse } from '@/api/types'
import { Duration, Money } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/States'
import { EnumText } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useBranchParam } from '@/features/branches/scope'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi, type CounterReportParams } from './api'
import { barPercent, defectFlag, hoursToMinutes, maxOf, percentText, quantityText, revenueRows } from './counterReportLogic'
import { resolvePeriod } from './logic'
import { PeriodFilter } from './PeriodFilter'
import { KpiTile } from './TrackingParts'
import './counterReportI18n'

const schema = { period: '30', from: '', to: '' }

/**
 * `/insights/counter` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 5 §8, phase 6 §12): the counter's volume, speed and
 * quality, quotation answers, money and parts, for a period and the branch switcher's scope. Null values are "—".
 */
export function CounterReportPage() {
  const { t } = useTranslation('counterReport')
  const { state, set } = useUrlState(schema)
  const { period, range, ready } = resolvePeriod(state)
  const branchId = useBranchParam()
  const params: CounterReportParams = { from: range.from, to: range.to, branchId }
  const query = useQuery({ queryKey: insightKeys.counter(params), queryFn: ({ signal }) => insightsApi.counter(params, signal), enabled: ready })

  return (
    <>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <PeriodFilter period={period} range={range} custom={{ from: state.from, to: state.to }} onChange={set} />
      {!ready ? null : query.isPending ? (
        <div className="space-y-4" aria-busy>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <Report r={query.data} />
      )}
    </>
  )
}

function Report({ r }: { r: CounterReportResponse }) {
  const { t } = useTranslation('counterReport')
  const { lang } = useLang()
  const n = (v: number | null | undefined, digits = 0) => formatNumber(v, lang, digits)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={<ClipboardList />} label={t('volume.intakes')} value={n(r.intakes)} sub={r.reworkIntakes > 0 ? t('volume.reworkIntakes', { count: r.reworkIntakes }) : undefined} />
        <KpiTile icon={<Truck />} label={t('volume.platformArrivals')} value={n(r.platformArrivals)} />
        <KpiTile icon={<PackageCheck />} label={t('volume.delivered')} value={n(r.delivered)} />
        <KpiTile icon={<Archive />} label={t('volume.abandoned')} value={n(r.abandoned)} className={cn(r.abandoned > 0 && 'border-tone-attention/40')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SpeedCard r={r} />
        <QuotesCard r={r} />
      </div>

      <MoneyCard r={r} />

      {r.parts && <PartsCard parts={r.parts} />}
    </div>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: 'danger' | 'success' }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-lg font-semibold', tone === 'danger' && 'text-tone-danger', tone === 'success' && 'text-tone-success')}>{value}</dd>
      {hint && <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A label, a plain bar against the largest row, and the value. */
function BarRow({ label, value, max, display, tone = 'primary' }: { label: ReactNode; value: number; max: number; display: ReactNode; tone?: 'primary' | 'danger' | 'muted' }) {
  return (
    <li className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
      <span className="truncate">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={cn('block h-full rounded-full', tone === 'primary' && 'bg-primary', tone === 'danger' && 'bg-tone-danger', tone === 'muted' && 'bg-tone-muted')}
          style={{ width: `${barPercent(value, max)}%` }}
        />
      </span>
      <span className="tabular text-end">{display}</span>
    </li>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-sm text-muted-foreground">{text}</p>
}

function SpeedCard({ r }: { r: CounterReportResponse }) {
  const { t } = useTranslation('counterReport')
  const { lang } = useLang()
  const maxCause = maxOf(r.rootCauses, (c) => c.count)
  return (
    <Card>
      <CardHeader title={t('speed.title')} />
      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label={t('speed.turnaround')} value={<Duration minutes={hoursToMinutes(r.averageTurnaroundHours)} />} hint={t('speed.turnaroundHint')} />
          <Stat label={t('speed.firstTimeFix')} value={percentText(r.firstTimeFixRate, lang)} hint={t('speed.firstTimeFixHint')} />
          <Stat label={t('speed.repaired')} value={formatNumber(r.repaired, lang)} />
          <Stat label={t('speed.reworked')} value={formatNumber(r.reworkedAfterRepair, lang)} tone={r.reworkedAfterRepair > 0 ? 'danger' : undefined} />
          <Stat label={t('speed.internalCost')} value={<Money value={r.reworkInternalCost} />} />
        </dl>

        <div>
          <h4 className="mb-2 text-sm font-semibold">{t('speed.byTechnician')}</h4>
          {r.reworkByTechnician.length === 0 ? (
            <Empty text={t('speed.noRework')} />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <THead>
                  <Tr>
                    <Th>{t('speed.technician')}</Th>
                    <Th className="text-end">{t('speed.repaired')}</Th>
                    <Th className="text-end">{t('speed.reworked')}</Th>
                    <Th className="text-end">{t('speed.rate')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {r.reworkByTechnician.map((x) => (
                    <Tr key={x.executorId}>
                      <Td>
                        <Link to={`/team/${x.executorId}`} className="hover:text-primary hover:underline">
                          {x.fullName}
                        </Link>
                      </Td>
                      <Td className="tabular text-end">{formatNumber(x.repaired, lang)}</Td>
                      <Td className="tabular text-end">{formatNumber(x.reworked, lang)}</Td>
                      <Td className={cn('tabular text-end', x.reworked > 0 && 'text-tone-danger')}>{percentText(x.reworkRate, lang)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">{t('speed.rootCauses')}</h4>
          {r.rootCauses.length === 0 ? (
            <Empty text={t('speed.noRework')} />
          ) : (
            <ul className="space-y-1.5">
              {r.rootCauses.map((c) => (
                <BarRow
                  key={c.rootCause}
                  label={<EnumText enum="ReworkRootCause" value={c.rootCause} />}
                  value={c.count}
                  max={maxCause}
                  display={formatNumber(c.count, lang)}
                  tone={c.rootCause === 'NewFault' || c.rootCause === 'CustomerMisuse' ? 'muted' : 'danger'}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}

function QuotesCard({ r }: { r: CounterReportResponse }) {
  const { t } = useTranslation('counterReport')
  const { lang } = useLang()
  return (
    <Card>
      <CardHeader title={t('quotes.title')} />
      <dl className="grid grid-cols-2 gap-2 p-4">
        <Stat label={t('quotes.decided')} value={formatNumber(r.quotationsDecided, lang)} />
        <Stat label={t('quotes.approved')} value={formatNumber(r.quotationsApproved, lang)} />
        <Stat label={t('quotes.approvalRate')} value={percentText(r.quoteApprovalRate, lang)} />
        <Stat label={t('quotes.responseTime')} value={<Duration minutes={hoursToMinutes(r.averageQuoteResponseHours)} />} />
      </dl>
    </Card>
  )
}

function MoneyCard({ r }: { r: CounterReportResponse }) {
  const { t } = useTranslation('counterReport')
  const { lang } = useLang()
  const split = revenueRows(r.revenue)
  const maxSplit = maxOf(split, (x) => x.value)
  const maxMethod = maxOf(r.paymentsByMethod, (x) => x.amount)
  const maxChannel = maxOf(r.revenueByChannel, (x) => x.revenue)
  return (
    <Card>
      <CardHeader title={t('money.title')} />
      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t('money.revenue')}</h4>
          <ul className="space-y-1.5">
            {split.map((x) => (
              <BarRow key={x.key} label={t(`money.${x.key}`)} value={x.value} max={maxSplit} display={<Money value={x.value} />} />
            ))}
          </ul>
          <p className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>{t('money.total')}</span>
            <Money value={r.revenue.total} />
          </p>
          <dl className="grid grid-cols-2 gap-2 pt-2">
            <Stat label={t('money.storageCharged')} value={<Money value={r.storageFeesCharged} />} />
            <Stat label={t('money.storageWaived')} value={<Money value={r.storageFeesWaived} />} />
          </dl>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t('money.byChannel')}</h4>
          <p className="text-xs text-muted-foreground">{t('money.channelHint')}</p>
          {r.revenueByChannel.length === 0 ? (
            <Empty text={t('money.none')} />
          ) : (
            <ul className="space-y-1.5">
              {r.revenueByChannel.map((c) => (
                <BarRow
                  key={c.channel}
                  label={
                    <>
                      <EnumText enum="FulfillmentChannel" value={c.channel} /> <span className="text-xs text-muted-foreground">({formatNumber(c.services, lang)})</span>
                    </>
                  }
                  value={c.revenue}
                  max={maxChannel}
                  display={<Money value={c.revenue} />}
                />
              ))}
            </ul>
          )}

          <h4 className="pt-3 text-sm font-semibold">{t('money.payments')}</h4>
          {r.paymentsByMethod.length === 0 ? (
            <Empty text={t('money.none')} />
          ) : (
            <ul className="space-y-1.5">
              {r.paymentsByMethod.map((m) => (
                <BarRow
                  key={m.method}
                  label={
                    <>
                      <EnumText enum="PaymentMethod" value={m.method} /> <span className="text-xs text-muted-foreground">({formatNumber(m.count, lang)})</span>
                    </>
                  }
                  value={m.amount}
                  max={maxMethod}
                  display={<Money value={m.amount} />}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 lg:col-span-2">
          <h4 className="flex items-center justify-between text-sm font-semibold">
            <span>{t('money.byUser')}</span>
            <span className="font-normal text-muted-foreground">
              {t('money.discounts')}: <Money value={r.discountsTotal} className="font-semibold text-foreground" />
            </span>
          </h4>
          {r.discountsByUser.length === 0 ? (
            <Empty text={t('money.none')} />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <THead>
                  <Tr>
                    <Th>{t('money.user')}</Th>
                    <Th className="text-end">{t('money.count')}</Th>
                    <Th className="text-end">{t('money.amount')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {r.discountsByUser.map((u) => (
                    <Tr key={u.userId}>
                      <Td>{u.fullName}</Td>
                      <Td className="tabular text-end">{formatNumber(u.count, lang)}</Td>
                      <Td className="text-end">
                        <Money value={u.amount} />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function DefectsTable({ title, rows, unknownLabel }: { title: string; rows: CounterDefectRate[]; unknownLabel?: string }) {
  const { t } = useTranslation('counterReport')
  const { lang } = useLang()
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {rows.length === 0 ? (
        <Empty text={t('money.none')} />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <THead>
              <Tr>
                <Th>{t('parts.name')}</Th>
                <Th className="text-end">{t('parts.defective')}</Th>
                <Th className="text-end">{t('parts.issued')}</Th>
                <Th className="text-end">{t('speed.rate')}</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((d, i) => (
                <Tr key={d.id ?? `unknown-${i}`}>
                  <Td>{d.id === null && unknownLabel ? <span className="text-muted-foreground">{unknownLabel}</span> : d.name}</Td>
                  <Td className="tabular text-end">{quantityText(d.defective, lang)}</Td>
                  <Td className="tabular text-end">{quantityText(d.issued, lang)}</Td>
                  <Td className={cn('tabular text-end', defectFlag(d.rate, d.issued) && 'font-semibold text-tone-danger')}>{percentText(d.rate, lang)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function PartsCard({ parts: p }: { parts: CounterPartsReport }) {
  const { t } = useTranslation('counterReport')
  const { lang, pick } = useLang()
  const maxValue = maxOf(p.stockValueByBranch, (b) => b.value)
  return (
    <Card>
      <CardHeader title={t('parts.title')} />
      <div className="space-y-6 p-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t('parts.revenue')} value={<Money value={p.partsRevenue} />} />
          <Stat label={t('parts.cost')} value={<Money value={p.partsCost} />} />
          <Stat label={t('parts.margin')} value={<Money value={p.partsMargin} />} tone={p.partsMargin < 0 ? 'danger' : undefined} />
          <Stat label={t('parts.marginPercent')} value={percentText(p.partsMarginPercent, lang)} />
        </dl>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t('parts.top')}</h4>
          {p.topParts.length === 0 ? (
            <Empty text={t('parts.noParts')} />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <THead>
                  <Tr>
                    <Th>{t('parts.name')}</Th>
                    <Th className="text-end">{t('parts.quantity')}</Th>
                    <Th className="text-end">{t('parts.cost_')}</Th>
                    <Th className="text-end">{t('parts.services')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {p.topParts.map((x) => (
                    <Tr key={x.partItemId}>
                      <Td>
                        <span className="block">{pick(x.nameAr, x.nameEn)}</span>
                        <bdi className="ltr-nums font-mono text-[0.6875rem] text-muted-foreground">{x.sku}</bdi>
                      </Td>
                      <Td className="tabular text-end">{quantityText(x.quantity, lang)}</Td>
                      <Td className="text-end">
                        <Money value={x.cost} />
                      </Td>
                      <Td className="tabular text-end">{formatNumber(x.services, lang)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <DefectsTable title={t('parts.defectsByPart')} rows={p.defectsByPart} />
          <DefectsTable title={t('parts.defectsBySupplier')} rows={p.defectsBySupplier} unknownLabel={t('parts.unknownSupplier')} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Boxes className="size-4 text-primary" aria-hidden /> {t('parts.stockValue')} <span className="text-xs font-normal text-muted-foreground">({t('parts.nowNote')})</span>
            </h4>
            {p.stockValueByBranch.length === 0 ? (
              <Empty text={t('money.none')} />
            ) : (
              <ul className="space-y-1.5">
                {p.stockValueByBranch.map((b) => (
                  <BarRow
                    key={b.branchId}
                    label={
                      <>
                        {b.branchName} <span className="text-xs text-muted-foreground">({t('parts.partsCount', { count: b.parts })})</span>
                      </>
                    }
                    value={b.value}
                    max={maxValue}
                    display={<Money value={b.value} />}
                  />
                ))}
              </ul>
            )}
            <p className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>{t('parts.stockValueTotal')}</span>
              <Money value={p.stockValueTotal} />
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>
                {t('parts.lowStock')} <span className="text-xs font-normal text-muted-foreground">({t('parts.nowNote')})</span>
              </span>
              <Button asChild size="xs" variant="outline">
                <Link to="/inventory/low-stock">{t('parts.lowStockAll')}</Link>
              </Button>
            </h4>
            {p.lowStock.length === 0 ? (
              <Empty text={t('money.none')} />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <THead>
                    <Tr>
                      <Th>{t('parts.name')}</Th>
                      <Th>{t('parts.branch')}</Th>
                      <Th className="text-end">{t('parts.available')}</Th>
                      <Th className="text-end">{t('parts.reorderLevel')}</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {p.lowStock.map((s) => (
                      <Tr key={s.stockItemId}>
                        <Td>
                          <span className="block">{pick(s.nameAr, s.nameEn)}</span>
                          <bdi className="ltr-nums font-mono text-[0.6875rem] text-muted-foreground">{s.sku}</bdi>
                        </Td>
                        <Td className="text-xs">{s.branchName}</Td>
                        <Td className={cn('tabular text-end', s.available < 0 && 'font-semibold text-tone-danger')}>{quantityText(s.available, lang)}</Td>
                        <Td className="tabular text-end">{quantityText(s.reorderLevel, lang)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
