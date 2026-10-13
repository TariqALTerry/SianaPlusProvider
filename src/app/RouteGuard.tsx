import { Hourglass, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useMatches } from 'react-router'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { routeDenial, type RouteAccess } from './nav'
import { useProvider } from './provider'

/**
 * Enforces each route's `handle` (`RouteAccess`) before the page mounts, so a page that is not
 * available yet (work before approval) or at all (tenders for an execution-only partner, a
 * disabled store) never renders and never fires requests the server would refuse.
 */
export function RouteGuard() {
  const { t } = useTranslation()
  const matches = useMatches()
  const ctx = useProvider()

  const rule = [...matches].reverse().find((m) => m.handle && typeof m.handle === 'object')?.handle as RouteAccess | undefined
  const denial = routeDenial(rule, ctx)
  if (!denial) return <Outlet />

  return (
    <EmptyState
      className="mt-16"
      icon={denial === 'notApproved' ? <Hourglass className="size-5" /> : <SearchX className="size-5" />}
      title={denial === 'notApproved' ? t('shell.workHidden') : t('notFound.title')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('notFound.back')}</Link>
        </Button>
      }
    />
  )
}
