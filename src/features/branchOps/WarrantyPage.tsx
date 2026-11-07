import { useQuery } from '@tanstack/react-query'
import { ExternalLink, ScanLine, Search, ShieldPlus } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { CounterRepairHistoryItem, CounterWarrantyLookupItem } from '@/api/types'
import { DateTime, Money } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { ScanDialog } from '@/features/counter/components/ScanDialog'
import { useUrlState } from '@/hooks/useUrlState'
import { useLang } from '@/hooks/useLang'
import { formatSaudiMobile } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { branchOpsApi, branchOpsKeys } from './api'
import { ClaimDialog } from './components/ClaimDialog'
import { lineState, lookupQuery } from './logic'
import './i18n'

const schema = { phone: '', imei: '', code: '' }

/**
 * `/counter/warranty` (phase 5 §6, phase 6 §11): find a counter warranty by phone, IMEI / serial or a code (warranty,
 * receipt or label) across every branch, see its lines and the device's repairs, and open a claim.
 */
export function WarrantyPage() {
  const { t } = useTranslation('branchOps')
  const uid = useId()
  const { state, set } = useUrlState(schema)
  const [draft, setDraft] = useState(state)
  const [scanOpen, setScanOpen] = useState(false)
  const [claiming, setClaiming] = useState<CounterWarrantyLookupItem | null>(null)
  useEffect(() => setDraft(state), [state])

  const query = lookupQuery(state)
  const lookup = useQuery({
    queryKey: branchOpsKeys.warranty(query ?? {}),
    queryFn: ({ signal }) => branchOpsApi.lookupWarranty(query!, signal),
    enabled: !!query,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    set({ phone: draft.phone.trim(), imei: draft.imei.trim(), code: draft.code.trim() })
  }
  const draftEmpty = !lookupQuery(draft)

  return (
    <>
      <PageHeader title={t('warranty.title')} description={t('warranty.description')} />

      <Card className="mb-4">
        <CardBody>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <Field label={t('warranty.phone')} htmlFor={`${uid}-phone`}>
              <Input id={`${uid}-phone`} type="tel" inputMode="tel" dir="ltr" className="h-12 text-base" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} autoComplete="off" />
            </Field>
            <Field label={t('warranty.imei')} htmlFor={`${uid}-imei`}>
              <Input id={`${uid}-imei`} dir="ltr" className="h-12 font-mono text-base" value={draft.imei} onChange={(e) => setDraft({ ...draft, imei: e.target.value })} autoComplete="off" />
            </Field>
            <Field label={t('warranty.code')} htmlFor={`${uid}-code`}>
              <div className="flex gap-2">
                <Input id={`${uid}-code`} dir="ltr" className="h-12 font-mono text-base" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} autoComplete="off" />
                <Button size="lg" variant="outline" className="h-12" onClick={() => setScanOpen(true)} aria-label={t('warranty.scan')}>
                  <ScanLine />
                </Button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="h-12" disabled={draftEmpty}>
              <Search /> {t('warranty.search')}
            </Button>
          </form>
        </CardBody>
      </Card>

      {!query ? (
        <EmptyState icon={<ShieldPlus className="size-5" />} title={t('warranty.start')} />
      ) : lookup.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : lookup.isError ? (
        <ErrorState error={lookup.error} onRetry={() => void lookup.refetch()} />
      ) : (
        <div className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t('warranty.warranties')}</h2>
            {lookup.data.warranties.length === 0 ? (
              <EmptyState title={t('warranty.none')} />
            ) : (
              lookup.data.warranties.map((w) => <WarrantyCard key={w.warrantyId} item={w} onClaim={() => setClaiming(w)} />)
            )}
          </section>
          <History rows={lookup.data.history} />
        </div>
      )}

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResult={(term) => {
          setScanOpen(false)
          setDraft({ phone: '', imei: '', code: term })
          set({ phone: '', imei: '', code: term })
        }}
      />
      {claiming && <ClaimDialog item={claiming} open={!!claiming} onOpenChange={(o) => !o && setClaiming(null)} />}
    </>
  )
}

function WarrantyCard({ item: w, onClaim }: { item: CounterWarrantyLookupItem; onClaim: () => void }) {
  const { t } = useTranslation('branchOps')
  const { pick } = useLang()
  const claimable = !w.alreadyClaimed && w.status !== 'Void'
  return (
    <Card className={cn(w.inWarranty && !w.alreadyClaimed && 'border-tone-success/40')}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <bdi className="ltr-nums font-mono">{w.warrantyNumber}</bdi>
            <StatusBadge enum="WarrantyStatus" value={w.status} />
            {w.alreadyClaimed ? (
              <Badge tone="muted">{t('warranty.alreadyClaimed')}</Badge>
            ) : w.inWarranty ? (
              <Badge tone="success">{t('warranty.inWarranty')}</Badge>
            ) : (
              <Badge tone="danger">{t('warranty.outOfWarranty')}</Badge>
            )}
          </span>
        }
        description={pick(w.serviceNameAr, w.serviceNameEn)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/counter/items/${w.serviceItemId}`}>
                <ExternalLink /> {t('warranty.openItem')}
              </Link>
            </Button>
            {w.claimServiceItemId && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/counter/items/${w.claimServiceItemId}`}>
                  <ExternalLink /> {t('warranty.openClaim')}
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <CardBody className="space-y-4">
        <KeyValue
          columns={3}
          items={[
            { label: t('warranty.device'), value: [w.deviceName, w.brand, w.model].filter(Boolean).join(' · ') || null },
            { label: 'IMEI', value: w.imei || w.serialNumber ? <bdi className="ltr-nums font-mono text-xs">{w.imei ?? w.serialNumber}</bdi> : null },
            {
              label: t('warranty.customer'),
              value: (
                <span>
                  {w.customerName}
                  {w.customerPhone && <bdi className="ltr-nums font-latin ms-1 text-xs text-muted-foreground">{formatSaudiMobile(w.customerPhone)}</bdi>}
                </span>
              ),
            },
            { label: t('warranty.intake'), value: w.intakeNumber || w.itemNumber ? <bdi className="ltr-nums font-mono">{w.intakeNumber ?? w.itemNumber}</bdi> : null },
            { label: t('warranty.branch'), value: w.branchName },
            { label: t('warranty.executor'), value: w.executorName },
            { label: t('warranty.completedAt'), value: w.completedAt ? <DateTime value={w.completedAt} mode="date" /> : null },
            { label: t('warranty.startsAt'), value: <DateTime value={w.startsAt} mode="date" /> },
            {
              label: t('warranty.endsAt'),
              value: (
                <span>
                  <DateTime value={w.endsAt} mode="date" />
                  {w.daysRemaining > 0 && <span className="ms-1 text-xs text-tone-success">({t('warranty.daysLeft', { count: w.daysRemaining })})</span>}
                </span>
              ),
            },
          ]}
        />

        {w.lines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('warranty.lines')}</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <THead>
                  <Tr>
                    <Th>{t('warranty.lineDescription')}</Th>
                    <Th>{t('warranty.lineKind')}</Th>
                    <Th className="text-end">{t('warranty.lineLeft')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {w.lines.map((line) => {
                    const state = lineState(line)
                    return (
                      <Tr key={line.id}>
                        <Td className="text-sm">
                          {line.description}
                          {line.quantity !== 1 && <span className="ms-1 text-xs text-muted-foreground">×{line.quantity}</span>}
                          {(line.sku || line.supplierName) && (
                            <span className="block text-xs text-muted-foreground">{[line.sku, line.supplierName, line.batchRef].filter(Boolean).join(' · ')}</span>
                          )}
                        </Td>
                        <Td>
                          <StatusBadge enum="WarrantyLineKind" value={line.kind} dot={false} />
                        </Td>
                        <Td className="text-end text-xs">
                          {state === 'claimable' ? (
                            <span className="text-tone-success">{t('warranty.daysLeft', { count: line.daysRemaining })}</span>
                          ) : state === 'claimed' ? (
                            <Badge tone="muted">{t('warranty.lineClaimed')}</Badge>
                          ) : (
                            <Badge tone="danger">{t('warranty.lineExpired')}</Badge>
                          )}
                        </Td>
                      </Tr>
                    )
                  })}
                </TBody>
              </Table>
            </div>
          </div>
        )}

        {claimable && (
          <Button size="lg" className="h-12 w-full sm:w-auto" onClick={onClaim}>
            <ShieldPlus /> {t('warranty.claim')}
          </Button>
        )}
      </CardBody>
    </Card>
  )
}

function History({ rows }: { rows: CounterRepairHistoryItem[] }) {
  const { t } = useTranslation('branchOps')
  const { pick } = useLang()
  return (
    <Card>
      <CardHeader title={t('warranty.history')} />
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('warranty.noHistory')}</p>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((r) => (
              <li key={r.serviceItemId} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={`/counter/items/${r.serviceItemId}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                      <bdi className="ltr-nums">{r.intakeNumber ?? r.itemNumber}</bdi>
                    </Link>
                    <StatusBadge enum="ServiceItemStatus" value={r.status} />
                    {r.repairOutcome && <StatusBadge enum="RepairOutcome" value={r.repairOutcome} dot={false} />}
                    {r.isRework && <Badge tone="attention">{t('warranty.rework')}</Badge>}
                    {r.reworkRootCause && (
                      <span className="text-xs text-muted-foreground">
                        {t('warranty.rootCause')}: <StatusBadge enum="ReworkRootCause" value={r.reworkRootCause} dot={false} />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {pick(r.serviceNameAr, r.serviceNameEn)}
                    {r.deviceName && ` · ${r.deviceName}`}
                    {r.executorName && ` · ${r.executorName}`}
                    {r.branchName && ` · ${r.branchName}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('warranty.received')}: <DateTime value={r.receivedAt} mode="date" />
                    {r.handedOverAt && (
                      <>
                        {' · '}
                        {t('warranty.completedAt')}: <DateTime value={r.handedOverAt} mode="date" />
                      </>
                    )}
                  </p>
                </div>
                <Money value={r.finalAmount} className="font-semibold" />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
