import { useQuery } from '@tanstack/react-query'
import { MapPinPlus, PlusCircle, ShieldCheck, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { useUrlState } from '@/hooks/useUrlState'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { insightKeys, insightsApi } from './api'
import { addCapabilityHref, addCoverageHref, DEMAND_RADII, DEFAULT_RADIUS, parseRadius } from './logic'
import './i18n'

const schema = { radius: DEFAULT_RADIUS }

/**
 * `/growth/demand` (PROVIDER-PLATFORM-PHASE2-PROMPT §3): customers waiting near the organization for a
 * service it lacks a capability or coverage for — counts only, never customer data.
 */
export function DemandPage() {
  const { t } = useTranslation('insights')
  const { lang, pick } = useLang()
  const { state, set } = useUrlState(schema)
  const radius = parseRadius(state.radius)
  const query = useQuery({ queryKey: insightKeys.demand(radius), queryFn: ({ signal }) => insightsApi.demand(radius, signal) })
  const data = query.data

  return (
    <>
      <PageHeader title={t('demand.title')} description={t('demand.subtitle')} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-tone-info-soft text-tone-info" aria-hidden>
          <Users className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-base font-semibold">
          {data ? t('demand.headline', { count: data.waitingCustomers, formattedCount: formatNumber(data.waitingCustomers, lang) }) : query.isPending ? <Skeleton className="h-5 w-64" /> : null}
        </p>
        <div className="flex items-center gap-1 text-xs" role="tablist" aria-label={t('demand.radius')}>
          <span className="me-1 text-muted-foreground">{t('demand.radius')}</span>
          {DEMAND_RADII.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={radius === r}
              onClick={() => set({ radius: r })}
              className={cn('rounded-full border px-3 py-1', radius === r ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
            >
              {t('demand.km', { n: formatNumber(r, lang) })}
            </button>
          ))}
        </div>
      </Card>

      <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> {t('demand.privacy')}
      </p>

      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : !data!.rows.length ? (
        <Card>
          <EmptyState title={t('demand.empty')} />
        </Card>
      ) : (
        <div className="space-y-2">
          {data!.baseLatitude === null && <p className="text-xs text-muted-foreground">{t('demand.noBase')}</p>}
          <Card className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>{t('demand.service')}</Th>
                  <Th>{t('demand.place')}</Th>
                  <Th className="text-end">{t('demand.waiting')}</Th>
                  <Th>{t('demand.oldest')}</Th>
                  <Th className="text-end">{t('demand.distance')}</Th>
                  <Th />
                </Tr>
              </THead>
              <TBody>
                {data!.rows.map((r) => (
                  <Tr key={`${r.canonicalServiceId}-${r.city}-${r.district ?? ''}`}>
                    <Td className="font-medium">{pick(r.serviceNameAr, r.serviceNameEn)}</Td>
                    <Td>
                      {r.district || <span className="text-muted-foreground">{t('demand.noDistrict')}</span>}
                      <span className="text-muted-foreground"> · {r.city}</span>
                    </Td>
                    <Td className="tabular text-end text-base font-semibold">{formatNumber(r.waiting, lang)}</Td>
                    <Td className="text-xs text-muted-foreground">{t('demand.since', { date: formatDate(r.oldestSince, lang) })}</Td>
                    <Td className="tabular text-end text-xs">{r.distanceKm === null ? t('demand.noDistance') : t('demand.km', { n: formatNumber(r.distanceKm, lang, 1) })}</Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.needsCapability && (
                          <Button asChild size="xs" variant="outline">
                            <Link to={addCapabilityHref(r.missingCapabilityIds)}>
                              <PlusCircle className="size-3.5" /> {t('demand.addCapability')}
                            </Link>
                          </Button>
                        )}
                        {r.needsCoverage && (
                          <Button asChild size="xs" variant="outline">
                            <Link to={addCoverageHref(r.city, r.district)}>
                              <MapPinPlus className="size-3.5" /> {t('demand.addCoverage')}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground">{t('demand.afterAdd')}</p>
        </div>
      )}
    </>
  )
}
