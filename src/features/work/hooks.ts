import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { i18next } from '@/i18n'
import type { ServiceItemProviderView } from '@/api/types'
import { WORK_INVALIDATION, workApi } from './api'
import { delegateSkipped } from './logic'
import './i18n'

/** The minimum a dialog needs about the item — fits both Incoming cards and the item page. */
export interface WorkTarget {
  id: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
}

/** `SI-10053-2 · صيانة غسالة` — the target restated in every action dialog. */
export function useTargetLabel() {
  const { pick } = useLang()
  return (item: WorkTarget) => [item.itemNumber, pick(item.serviceNameAr, item.serviceNameEn)].filter(Boolean).join(' · ')
}

/**
 * Work writes are refused with `ProviderNotOperational` unless the organization is Approved or
 * in an open Trial (§4). Buttons stay visible but disabled, with this as their title.
 */
export function useWriteGate(): { disabled: boolean; reason: string | undefined } {
  const { operational } = useProvider()
  const { t } = useTranslation('work')
  return { disabled: !operational, reason: operational ? undefined : t('writeGate') }
}

const tw = (key: string, options?: Record<string, unknown>) => i18next.t(key, { ns: 'work', ...options })

/** Toast for a delegate result: auto-assigned, or skipped because nobody qualifies (§8.3). */
function announceDelegate(view: ServiceItemProviderView, previousExecutorId: string | null) {
  if (delegateSkipped(view)) toast.warning(tw('actions.delegateSkipped'))
  // Same technician as before: either kept (auto-assign skipped) or re-picked — say only that it was delegated.
  else if (view.executor && view.executor.id !== previousExecutorId) toast.success(tw('actions.success.delegateAssigned', { name: view.executor.fullName }))
  else toast.success(tw('actions.success.delegate'))
}

/**
 * "دع المنصة تختار" — one click on an Incoming card (`errorToast`), or behind a confirm on the
 * item page. `mutate({ id, previousExecutorId })`.
 */
export function useDelegateAction(options: { errorToast?: boolean; onDone?: () => void } = {}) {
  return useAction({
    mutationFn: ({ id }: { id: string; previousExecutorId: string | null }) => workApi.delegate(id),
    invalidate: WORK_INVALIDATION,
    errorToast: options.errorToast,
    onSuccess: (view, vars) => {
      announceDelegate(view, vars.previousExecutorId)
      options.onDone?.()
    },
  })
}
