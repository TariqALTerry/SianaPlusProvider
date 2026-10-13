import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/api/http'
import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <div className="rounded-full bg-muted p-3 text-muted-foreground">{icon ?? <Inbox className="size-5" />}</div>
      <p className="font-medium">{title ?? t('table.empty')}</p>
      {description && <div className="max-w-md text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Human message for a failed query: server message when it sent one, else a generic line. */
export function useErrorMessage() {
  const { t } = useTranslation()
  return (error: unknown): string => {
    const e = toApiError(error)
    if (e.status === 0 && e.errorCode === 'NetworkError') return t('errors.network')
    if (e.status === 429) return t('errors.rateLimited')
    if (e.status === 404 && !e.message) return t('errors.notFound')
    if (e.status === 403 && !e.message) return t('errors.forbidden')
    if (e.status >= 500) return e.message && e.message !== 'UnknownError' ? e.message : t('errors.generic')
    return e.message && e.message !== 'UnknownError' ? e.message : t('errors.generic')
  }
}

export function ErrorState({ error, onRetry, className, compact }: { error: unknown; onRetry?: () => void; className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const message = useErrorMessage()(error)
  const e = toApiError(error)
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-2 px-6 text-center', compact ? 'py-6' : 'py-12', className)}
    >
      <div className="rounded-full bg-destructive-soft p-3 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <p className="font-medium">{e.status === 404 ? t('errors.notFound') : t('errors.loadFailed')}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw /> {t('actions.retry')}
        </Button>
      )}
    </div>
  )
}

/** Inline error inside a dialog or form: the server's localized message, kept on screen. */
export function InlineError({ error, className }: { error: unknown; className?: string }) {
  const message = useErrorMessage()(error)
  if (!error) return null
  const details = toApiError(error).details
  // Structured error data: a list of offending items, or an object like `{ status: "InProgress" }`.
  const lines: string[] = Array.isArray(details)
    ? details.map((d) => (typeof d === 'string' ? d : JSON.stringify(d)))
    : details && typeof details === 'object'
      ? Object.entries(details as Record<string, unknown>).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      : []
  return (
    <div role="alert" className={cn('rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive', className)}>
      <p>{message}</p>
      {lines.length > 0 && (
        <ul className="mt-1 list-disc ps-5 text-xs" dir="auto">
          {lines.slice(0, 10).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-1" aria-busy>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <RefreshCw className={cn('size-4 animate-spin text-muted-foreground', className)} aria-hidden />
}
