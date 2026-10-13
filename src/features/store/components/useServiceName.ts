import { useQuery } from '@tanstack/react-query'
import { toApiError } from '@/api/http'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import { useLang } from '@/hooks/useLang'
import { catalogApi, catalogKeys } from '../api'

/** Name of a linked service, resolved through the public catalog (404 for hidden/internal ones). */
export function useServiceName(id: string | null | undefined) {
  const { pick } = useLang()
  const query = useQuery({
    queryKey: catalogKeys.service(id ?? ''),
    queryFn: ({ signal }) => catalogApi.service(id!, signal),
    enabled: !!id,
    staleTime: LOOKUP_STALE_TIME,
    retry: false,
  })
  return {
    name: query.data ? pick(query.data.nameAr, query.data.nameEn) : null,
    code: query.data?.code ?? null,
    missing: query.isError && toApiError(query.error).status === 404,
    isLoading: query.isLoading,
  }
}
