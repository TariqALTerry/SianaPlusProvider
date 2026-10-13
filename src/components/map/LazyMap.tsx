import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MapViewProps } from './MapView'

export type { MapCircle, MapLine, MapMarker, MapViewProps } from './MapView'

/** Leaflet is ~150 KB; it loads only when a page actually renders a map (§14.7). */
const MapView = lazy(() => import('./MapView'))

export function LazyMap({ className, ...props }: MapViewProps & { className?: string }) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-md border', className)}>
      <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
        <MapView {...props} />
      </Suspense>
    </div>
  )
}

/** Small single-point map for address cards; renders nothing without coordinates. */
export function PointMap({ lat, lng, className }: { lat: number | null | undefined; lng: number | null | undefined; className?: string }) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null
  return <LazyMap className={cn('h-40', className)} markers={[{ id: 'p', lat, lng }]} zoom={14} />
}

/**
 * Resolved colour for a status tone. Leaflet writes colours into SVG attributes, where `var()`
 * does not resolve, so the theme variable is read out of the computed style.
 */
export function toneColor(tone: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--tone-${tone}`).trim()
  return raw ? `hsl(${raw.replace(/\s+/g, ', ').replace(/,\s*,/g, ',')})` : '#2563eb'
}
