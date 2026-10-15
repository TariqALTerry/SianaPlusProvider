import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/components/States'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { organizationApi, organizationKeys } from '../api'

/** Leaflet + geoman + turf load only when this tab opens (§10 "maps load only on the coverage tab"). */
const CoverageEditor = lazy(() => import('./coverage/CoverageEditor'))

function EditorSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-[22rem] sm:h-[28rem] lg:h-[32rem]" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

/** مناطق التغطية (§8.9). */
export function CoverageTab() {
  const { t } = useTranslation('organization')
  // From "طلب قريب منك" (PHASE2 §3): open a new area for that district, prefilled.
  const [params] = useSearchParams()
  const suggestCity = params.get('city')
  const suggest = suggestCity ? { city: suggestCity, district: params.get('district') ?? '' } : null
  const query = useQuery({
    queryKey: organizationKeys.coverage,
    queryFn: ({ signal }) => organizationApi.coverage(signal),
  })

  return (
    <Card>
      <CardHeader title={t('coverage.title')} />
      <CardBody className="space-y-4">
        <p className="flex items-start gap-2 rounded-md bg-brand-cream px-3 py-2 text-sm text-foreground dark:bg-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t('coverage.explain')}
        </p>
        {query.isPending ? (
          <EditorSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
        ) : (
          <Suspense fallback={<EditorSkeleton />}>
            <CoverageEditor areas={query.data} suggest={suggest} />
          </Suspense>
        )}
      </CardBody>
    </Card>
  )
}
