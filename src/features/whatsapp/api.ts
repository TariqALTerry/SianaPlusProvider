import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderWhatsAppResponse, SaveProviderWhatsAppRequest, TestProviderWhatsAppRequest } from '@/api/types'

const base = '/api/provider/whatsapp'

/**
 * `ProviderWhatsAppController` (PROVIDER-BRANCHES-PROVIDER-PLATFORM-PROMPT phase 4 §5). The owner and supervisors read;
 * saving, testing and unlinking are the owner's (`OwnerOnly`). Tokens are never sent back: only `accessTokenMasked`.
 */
export const whatsappApi = {
  get: (signal?: AbortSignal) => http.get<ProviderWhatsAppResponse>(base, undefined, signal),
  /** Blank token / secret keep the saved ones; changing the ids or the token clears `verified`. */
  save: (body: SaveProviderWhatsAppRequest) => http.put<ProviderWhatsAppResponse>(base, body),
  /** Clears the link; messages go back to the platform number. */
  unlink: () => http.delete<ProviderWhatsAppResponse>(base),
  /** A failed test is not an HTTP error: read `lastTestSucceeded` / `lastTestError`. */
  test: (body: TestProviderWhatsAppRequest) => http.post<ProviderWhatsAppResponse>(`${base}/test`, body, { timeout: 60_000 }),
}

export const whatsappKeys = {
  settings: () => [...qk.whatsapp, 'settings'] as const,
}

export function useWhatsAppSettings() {
  return useQuery({ queryKey: whatsappKeys.settings(), queryFn: ({ signal }) => whatsappApi.get(signal) })
}
