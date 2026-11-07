import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toApiError } from '@/api/http'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { catalogApi, catalogKeys } from '@/features/store/api'
import type { CounterItemDetailResponse } from '@/api/types'
import { useRoleKind } from '@/features/auth/authStore'
import { useMyBranches } from '@/features/branches/api'
import { useBranchScope } from '@/features/branches/scope'
import { useSubscriptionOverview } from '@/features/subscription/api'
import { openPdf, printPdf } from '@/lib/pdf'
import { counterApi } from './api'
import { accessAsOverview, counterGate, type CounterGate } from './logic'
import './i18n'

/**
 * The counter gate for the switcher's branch (phase 2 §3, phase 3 §2). The owner and supervisors read the live
 * subscription gate; a front-desk account cannot (the endpoint is the management's) and reads the same gate from
 * `me/branches` (`counter`).
 * `anyBranch`: the wizard, where the intake branch is picked among those running the counter.
 */
export function useCounterGate(options: { anyBranch?: boolean } = {}): CounterGate & { loading: boolean; frontDesk: boolean } {
  const role = useRoleKind()
  const frontDesk = role === 'frontDesk'
  const scope = useBranchScope()
  const overview = useSubscriptionOverview(!frontDesk)
  const mine = useMyBranches()
  const gate = counterGate({ overview: frontDesk ? accessAsOverview(mine.data?.counter) : overview.data, branch: options.anyBranch ? null : scope.selected, branches: scope.branches })
  return { ...gate, loading: scope.isLoading || (!frontDesk && overview.isPending), frontDesk }
}

/**
 * The documents of a counter item: print (hidden iframe) or open (new tab) its PDFs, and the WhatsApp share links.
 * Each print / share also writes the share log (`share-log`) the timeline shows.
 */
export function useCounterDocuments(item: Pick<CounterItemDetailResponse, 'serviceItemId' | 'whatsAppShareUrl' | 'whatsAppReadyUrl'>) {
  const { t } = useTranslation('counter')
  const id = item.serviceItemId
  const log = (document: 'Receipt' | 'Ready' | 'Invoice' | 'Warranty', channel: 'WhatsApp' | 'Print') => void counterApi.shareLog(id, document, channel).catch(() => undefined)
  const fail = (e: unknown) => toast.error(toApiError(e).message && toApiError(e).message !== 'UnknownError' ? toApiError(e).message : t('item.pdfFailed'))

  return {
    printReceipt: (format: 'a5' | 'thermal') =>
      printPdf(() => counterApi.receipt(id, format))
        .then(() => log('Receipt', 'Print'))
        .catch(fail),
    printLabel: (deviceId?: string | null) => printPdf(() => counterApi.label(id, deviceId)).catch(fail),
    openInvoice: () =>
      openPdf(() => counterApi.invoice(id))
        .then(() => log('Invoice', 'Print'))
        .catch(fail),
    openWarranty: () =>
      openPdf(() => counterApi.warranty(id))
        .then(() => log('Warranty', 'Print'))
        .catch(fail),
    /** Opens WhatsApp with the receipt message, then logs it. Null when the customer has no valid number. */
    shareReceipt: item.whatsAppShareUrl
      ? () => {
          window.open(item.whatsAppShareUrl!, '_blank', 'noopener')
          log('Receipt', 'WhatsApp')
        }
      : null,
    shareReady: item.whatsAppReadyUrl
      ? () => {
          window.open(item.whatsAppReadyUrl!, '_blank', 'noopener')
          log('Ready', 'WhatsApp')
        }
      : null,
  }
}

/** One catalog service, with its issues (for the optional `serviceIssueId`). */
export function useService(id: string | null | undefined) {
  return useQuery({
    queryKey: catalogKeys.service(id ?? ''),
    queryFn: ({ signal }) => catalogApi.service(id!, signal),
    enabled: !!id,
    staleTime: LOOKUP_STALE_TIME,
    retry: false,
  })
}
