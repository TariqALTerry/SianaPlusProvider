import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { ErrorState } from '@/components/States'

/** A route whose page failed to load or render: shown inside the shell, with a reload. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return (
    <ErrorState
      error={error instanceof Error ? new Error(t('errors.pageCrashed')) : error}
      onRetry={() => window.location.reload()}
    />
  )
}
