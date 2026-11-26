import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { Suspense, lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/features/auth/authStore'
import { useBranchScope } from '@/features/branches/scope'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { cn } from '@/lib/utils'
import { assistantApi, assistantKeys } from './api'
import { useAssistantPanel } from './store'
import './i18n'

const AssistantPanel = lazy(() => import('./components/AssistantPanel').then((m) => ({ default: m.AssistantPanel })))

/**
 * The «اسأل المساعد» button on every page (and Ctrl+J), and the panel when open: for the owner, supervisors and the front desk
 * while the platform has the provider assistant on. The branch picked in the switcher goes with every message. A count on the
 * button when today's brief has something critical.
 */
export function AssistantHost() {
  const { t } = useTranslation('assistantPanel')
  const canUse = useAuthStore((s) => s.status === 'authenticated')
  const scope = useBranchScope()
  const { open, toggle } = useAssistantPanel()

  const sections = useQuery({
    queryKey: assistantKeys.sections(),
    queryFn: ({ signal }) => assistantApi.sections(signal),
    enabled: canUse,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const enabled = canUse && sections.data?.enabled === true

  // Proactive: the brief, every five minutes while the tab is visible, lights the button when something is critical.
  const poll = usePollingInterval(5 * 60_000)
  const brief = useQuery({
    queryKey: assistantKeys.brief(),
    queryFn: ({ signal }) => assistantApi.brief(signal),
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: poll,
    retry: false,
  })
  const critical = brief.data?.items.filter((i) => i.severity === 'critical').length ?? 0

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, toggle])

  if (!enabled || !sections.data) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={toggle}
          title={`${t('launcher')} (${t('shortcut')})`}
          className={cn(
            'group fixed bottom-5 end-5 z-30 flex h-12 items-center gap-2 rounded-full bg-gradient-to-l from-brand-deep via-primary to-brand-teal ps-3 pe-4 text-white shadow-lg shadow-primary/30 ring-1 ring-white/20 transition-all hover:-translate-y-0.5 hover:shadow-xl print:hidden',
          )}
        >
          <span className="relative flex size-7 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="size-4 transition-transform group-hover:rotate-12" />
            {critical > 0 && (
              <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-tone-danger text-[9px] font-bold ring-2 ring-white">{critical}</span>
            )}
          </span>
          <span className="text-sm font-semibold">{t('launcher')}</span>
        </button>
      )}
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel sections={sections.data} branchId={scope.branchId ?? null} />
        </Suspense>
      )}
    </>
  )
}
