import { useQuery } from '@tanstack/react-query'
import { FileText, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { insightKeys, insightsApi } from './api'
import './i18n'

/**
 * "ملخص الزيارة" (PROVIDER-PLATFORM-PHASE2-PROMPT §7): two or three lines — the problem, the device, the
 * customer's history and warranty — shown as written. Cached 12 h on the server, so no refresh button;
 * the same text the technician reads in the app.
 */
export function VisitBrief({ serviceItemId }: { serviceItemId: string }) {
  const { t } = useTranslation('insights')
  const query = useQuery({
    queryKey: insightKeys.brief(serviceItemId),
    queryFn: ({ signal }) => insightsApi.jobBrief(serviceItemId, signal),
    staleTime: 60 * 60_000,
    retry: false,
  })
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" /> {t('brief.title')}
          </span>
        }
        actions={
          query.data?.source === 'ai' ? (
            <Badge tone="info">
              <Sparkles className="size-3" /> {t('brief.ai')}
            </Badge>
          ) : undefined
        }
      />
      <CardBody className="pt-0">
        {query.isPending ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : query.isError || !query.data.text ? (
          <p className="text-sm text-muted-foreground">{t('brief.unavailable')}</p>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed" dir="auto">
            {query.data.text}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
