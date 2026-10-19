import { qk } from '@/api/keys'

/**
 * The data of the page a notification opens (PHASE2 §8 table): refreshed when a push arrives, so the open
 * page and the badges update without waiting for their polls.
 */
export function referenceQueryKeys(referenceType: string | null | undefined): ReadonlyArray<readonly string[]> {
  switch (referenceType) {
    case 'ServiceItem':
      return [qk.work, qk.incoming, qk.board, qk.dashboard]
    case 'ServiceItemConversation':
      return [qk.messages]
    case 'ProviderWithdrawal':
      return [qk.wallet, qk.settlements]
    case 'Settlement':
      return [qk.settlements, qk.wallet]
    case 'MarketplaceRequest':
      return [qk.marketplace]
    case 'Dispute':
      return [qk.disputes]
    case 'SupportTicket':
      return [qk.support]
    default:
      return []
  }
}
