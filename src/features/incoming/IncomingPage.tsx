import { Inbox, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { IncomingWorkItemResponse } from '@/api/types'
import { CandidatePickerDialog } from '@/features/work/components/CandidatePickerDialog'
import { RejectDialog } from '@/features/work/components/WorkDialogs'
import { WriteGateNote } from '@/features/work/components/widgets'
import './i18n'
import { AlertsToggle } from './components/AlertsToggle'
import { IncomingCard } from './components/IncomingCard'
import { useIncoming } from './queries'

type Open = { kind: 'pick' | 'reject'; item: IncomingWorkItemResponse } | null

/**
 * `/incoming` (§8.3), the most important screen: one card per item waiting for a technician,
 * oldest first (the server's order). Reads the shared `useIncoming()` query (30 s poll) that
 * also drives the sidebar badge and the desktop alerts. There is no "accept": assigning a
 * technician is the acceptance.
 */
export function IncomingPage() {
  const { t } = useTranslation('incoming')
  const query = useIncoming()
  const [open, setOpen] = useState<Open>(null)
  // Keep the last target while a dialog animates closed (and after the item leaves the list).
  const [last, setLast] = useState<IncomingWorkItemResponse | null>(null)
  const show = (kind: 'pick' | 'reject', item: IncomingWorkItemResponse) => {
    setLast(item)
    setOpen({ kind, item })
  }
  const items = query.data ?? []

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={
          query.data && items.length > 0 ? (
            <span className="tabular rounded-full bg-tone-waiting-soft px-2 py-0.5 text-xs font-medium text-tone-waiting">{t('count', { count: items.length })}</span>
          ) : undefined
        }
        actions={
          <>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <RefreshCw className={query.isFetching ? 'size-3 animate-spin' : 'size-3'} aria-hidden /> {t('refreshHint')}
            </span>
            <AlertsToggle />
          </>
        }
      />

      <WriteGateNote className="mb-3" />

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={t('empty')}
            description={t('emptyHint')}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/work">{t('goWork')}</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex">
              <IncomingCard item={item} onPick={() => show('pick', item)} onReject={() => show('reject', item)} />
            </li>
          ))}
        </ul>
      )}

      {last && (
        <>
          <CandidatePickerDialog item={last} open={open?.kind === 'pick'} onOpenChange={(o) => !o && setOpen(null)} />
          <RejectDialog item={last} open={open?.kind === 'reject'} onOpenChange={(o) => !o && setOpen(null)} />
        </>
      )}
    </>
  )
}
