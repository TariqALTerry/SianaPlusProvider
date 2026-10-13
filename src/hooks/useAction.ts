import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError } from '@/api/http'
import { i18next } from '@/i18n'

interface UseActionOptions<TVars, TResult> {
  mutationFn: (vars: TVars) => Promise<TResult>
  /** Query-key prefixes to invalidate on success: the entity, its parent, its list, overview. */
  invalidate?: readonly QueryKey[] | ((result: TResult, vars: TVars) => readonly QueryKey[])
  /** Toast text on success; omit for silent actions. */
  success?: string | ((result: TResult, vars: TVars) => string)
  onSuccess?: (result: TResult, vars: TVars) => void
  /**
   * For one-click actions with no dialog to hold the error (e.g. "دع المنصة تختار" on a card):
   * show the server's message as a toast.
   */
  errorToast?: boolean
}

/**
 * Every mutating action goes through here (§4.4): no optimistic status changes (the server
 * decides transitions), targeted invalidation, a toast on success, and the error left on the
 * mutation so the open dialog can show the server's message and stay open.
 */
export function useAction<TVars = void, TResult = unknown>(options: UseActionOptions<TVars, TResult>) {
  const queryClient = useQueryClient()
  return useMutation<TResult, unknown, TVars>({
    mutationFn: options.mutationFn,
    onSuccess: async (result, vars) => {
      const keys = typeof options.invalidate === 'function' ? options.invalidate(result, vars) : options.invalidate ?? []
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      const message = typeof options.success === 'function' ? options.success(result, vars) : options.success
      if (message) toast.success(message)
      options.onSuccess?.(result, vars)
    },
    onError: options.errorToast
      ? (error) => {
          const e = toApiError(error)
          toast.error(e.message && e.message !== 'UnknownError' ? e.message : i18next.t('errors.generic'))
        }
      : undefined,
  })
}
