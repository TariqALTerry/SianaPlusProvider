import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import type { StoreCategoryResponse, StoreProductImageResponse } from '@/api/types'
import { usePollingInterval } from '@/hooks/usePageVisible'
import { storeCategoriesApi, storeCategoryKeys, storeImagesApi, storeProductKeys } from './api'
import type { GalleryItem } from './productForm'

/** §4.4: ask every 5 s until the picture is Ready or Failed. */
const IMAGE_POLL_MS = 5_000

/** Active sections and their categories (§4.1), shared by the pickers and the list filter. */
export function useCategoryTree(enabled = true) {
  return useQuery({
    queryKey: storeCategoryKeys.tree(),
    queryFn: ({ signal }) => storeCategoriesApi.tree(signal),
    staleTime: LOOKUP_STALE_TIME,
    enabled,
  })
}

export interface CategoryIndexEntry {
  category: StoreCategoryResponse
  section: StoreCategoryResponse | null
}

/** id → category and its section, for labels ("أجهزة › سخانات المياه"). */
export function useCategoryIndex(tree: StoreCategoryResponse[] | undefined) {
  return useMemo(() => {
    const map = new Map<string, CategoryIndexEntry>()
    for (const section of tree ?? []) {
      map.set(section.id, { category: section, section: null })
      for (const child of section.children) map.set(child.id, { category: child, section })
    }
    return map
  }, [tree])
}

/**
 * The latest state of every uploaded gallery picture, polled while Pending. Seeded from what the
 * product or the upload returned, so a Ready picture is never fetched again.
 */
export function useGalleryImages(items: GalleryItem[]): Map<string, StoreProductImageResponse> {
  const interval = usePollingInterval(IMAGE_POLL_MS)
  const withIds = items.filter((i): i is GalleryItem & { id: string } => !!i.id)
  const results = useQueries({
    queries: withIds.map((item) => ({
      queryKey: storeProductKeys.image(item.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => storeImagesApi.detail(item.id, signal),
      initialData: item.image ?? undefined,
      staleTime: Infinity,
      refetchInterval: (query: { state: { data?: StoreProductImageResponse } }) => (query.state.data?.status === 'Pending' ? interval : false),
    })),
  })
  const signature = results.map((r) => `${r.data?.id}:${r.data?.status}:${r.data?.imageUrl}:${r.dataUpdatedAt}`).join(',')
  return useMemo(() => {
    const map = new Map<string, StoreProductImageResponse>()
    for (const r of results) if (r.data) map.set(r.data.id, r.data)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
}

/** The cover the app would show: the first Ready picture in gallery order. */
export function coverOf(items: GalleryItem[], images: Map<string, StoreProductImageResponse>): StoreProductImageResponse | null {
  for (const item of items) {
    const image = item.id ? images.get(item.id) : null
    if (image?.status === 'Ready' && image.imageUrl) return image
  }
  return null
}

export function readyCount(items: GalleryItem[], images: Map<string, StoreProductImageResponse>): number {
  return items.filter((i) => {
    const image = i.id ? images.get(i.id) : null
    return image?.status === 'Ready' && !!image.imageUrl
  }).length
}
