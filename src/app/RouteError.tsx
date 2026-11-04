import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { ErrorState } from '@/components/States'
import { reportError } from '@/lib/monitoring'

/** A route whose page failed to load or render: shown inside the shell, with a reload. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  useEffect(() => {
    // Only real crashes; a router 404/ErrorResponse is not a bug.
    if (error instanceof Error) reportError(error)
  }, [error])
  return (
    <ErrorState
      error={error instanceof Error ? new Error(t('errors.pageCrashed')) : error}
      onRetry={() => window.location.reload()}
    />
  )
}
