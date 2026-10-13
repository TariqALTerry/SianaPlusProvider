import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { QuickTabs } from '@/components/Filters'
import { ErrorState } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExecutorLoadResponse } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { formatDateTime } from '@/lib/format'
import { workApi, workKeys, type WorkListParams } from '@/features/work/api'
import { LoadBar } from '@/features/work/components/widgets'
import { PROVIDER_ACTIVE_STATUSES } from '@/features/work/logic'
import '@/features/work/i18n'
import '../i18n'

const PAGE_SIZE = 10

/** A technician's items (`GET …/work/executors/{executorId}/items`), from the board's executors panel. */
export function ExecutorItemsSheet({ executor, onClose }: { executor: ExecutorLoadResponse | null; onClose: () => void }) {
  const { t } = useTranslation('board')
  const { t: tw } = useTranslation('work')
  const { lang, pick, isRtl } = useLang()
  const [scope, setScope] = useState<'active' | 'all'>('active')
  const [page, setPage] = useState(1)
  useEffect(() => {
    setScope('active')
    setPage(1)
  }, [executor?.executorId])

  const params: WorkListParams = { status: scope === 'active' ? [...PROVIDER_ACTIVE_STATUSES] : [], page, pageSize: PAGE_SIZE }
  const query = useQuery({
    queryKey: workKeys.executorItems(executor?.executorId ?? '', params),
    queryFn: ({ signal }) => workApi.executorItems(executor!.executorId, params, signal),
    enabled: !!executor,
    placeholderData: keepPreviousData,
  })
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight
  const rows = query.data?.items ?? []

  return (
    <Dialog open={!!executor} onOpenChange={(o) => !o && onClose()}>
      <SheetContent size="md">
        <DialogHeader>
          <DialogTitle>{tw('executorItems.title', { name: executor?.fullName ?? '' })}</DialogTitle>
          {executor && (
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge enum="ExecutorAvailability" value={executor.availability} />
                <LoadBar used={executor.activeJobs} total={executor.maxConcurrentJobs} />
              </div>
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3">
          <QuickTabs
            value={scope}
            onChange={(k) => {
              setScope(k as 'active' | 'all')
              setPage(1)
            }}
            tabs={[
              { key: 'active', label: tw('executorItems.active') },
              { key: 'all', label: tw('tabs.all') },
            ]}
          />
          {query.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tw('executorItems.empty')}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link to={`/work/${r.id}`} onClick={onClose} className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{pick(r.serviceNameAr, r.serviceNameEn)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.itemNumber && <span className="ltr-nums font-mono">{r.itemNumber}</span>}
                        {r.scheduledStart && <span className="tabular ltr-nums"> · {formatDateTime(r.scheduledStart, lang)}</span>}
                        {(r.address.district || r.address.city) && <span> · {r.address.district ?? r.address.city}</span>}
                      </span>
                    </span>
                    <StatusBadge enum="ServiceItemStatus" value={r.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {query.data && query.data.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular">{t('common:table.pageOf', { page, pages: query.data.totalPages })}</span>
              <span className="flex gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label={t('common:actions.previous')}>
                  <Prev />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p + 1)} disabled={!query.data.hasNextPage} aria-label={t('common:actions.next')}>
                  <Next />
                </Button>
              </span>
            </div>
          )}
          {executor && (
            <Button asChild variant="link" size="xs">
              <Link to={`/work?executorId=${executor.executorId}`} onClick={onClose}>
                {tw('executorItems.viewAll')}
              </Link>
            </Button>
          )}
        </DialogBody>
      </SheetContent>
    </Dialog>
  )
}
