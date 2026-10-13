import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollRestoration, useLocation } from 'react-router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageSkeleton } from '@/components/States'
import { Dialog, SheetContent } from '@/components/ui/dialog'
import { useNetStatus } from '@/api/netStatus'
import { IncomingWatcher } from '@/features/incoming/IncomingWatcher'
import { readItem, writeItem } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { useProvider } from './provider'
import { RouteGuard } from './RouteGuard'
import { Sidebar } from './Sidebar'
import { StatusBanner } from './StatusBanner'
import { Topbar } from './Topbar'

function RateLimitBanner() {
  const { t } = useTranslation()
  const until = useNetStatus((s) => s.rateLimitedUntil)
  if (!until) return null
  return (
    <div role="status" aria-live="polite" className="border-b border-tone-waiting/30 bg-tone-waiting-soft px-4 py-1.5 text-center text-xs text-tone-waiting">
      {t('shell.rateLimited')}
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const { mode } = useProvider()
  const [collapsed, setCollapsed] = useState(() => readItem<boolean>('sidebarCollapsed', false))
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => writeItem('sidebarCollapsed', collapsed), [collapsed])

  return (
    <div className="flex min-h-screen">
      {/* The document scrolls (not an inner container) so ScrollRestoration restores lists on Back. */}
      <ScrollRestoration getKey={(loc) => loc.pathname + loc.search} />
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block', collapsed ? 'w-[4.5rem]' : 'w-64')}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent size="sm" className="!end-auto start-0 w-72 border-e border-s-0 p-0 [--slide-from:-100%] rtl:[--slide-from:100%]" hideClose aria-describedby={undefined}>
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <StatusBanner />
        <RateLimitBanner />
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6">
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <RouteGuard />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {mode === 'full' && <IncomingWatcher />}
    </div>
  )
}
