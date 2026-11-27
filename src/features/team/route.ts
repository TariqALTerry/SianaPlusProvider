import type { RouteResponse, RouteStopResponse } from '@/api/types'

/** Numbered pins in the visiting order; stops without a map pin are left off the map. */
export function routePins(route: Pick<RouteResponse, 'stops'>) {
  return route.stops
    .filter((s): s is RouteStopResponse & { latitude: number; longitude: number } => s.latitude != null && s.longitude != null)
    .map((s) => ({ id: s.serviceItemId, lat: s.latitude, lng: s.longitude, text: String(s.order), lateRisk: s.lateRisk }))
}

/** The legs drawn between the start and the pins, in order. */
export function routeLegs(route: Pick<RouteResponse, 'stops' | 'startLatitude' | 'startLongitude'>) {
  const points: [number, number][] = []
  if (route.startLatitude != null && route.startLongitude != null) points.push([route.startLatitude, route.startLongitude])
  for (const p of routePins(route)) points.push([p.lat, p.lng])
  return points.slice(1).map((to, i) => ({ id: `leg-${i}`, from: points[i]!, to }))
}

export function lateCount(route: Pick<RouteResponse, 'stops'>): number {
  return route.stops.filter((s) => s.lateRisk).length
}
