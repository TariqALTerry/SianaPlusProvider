import turfArea from '@turf/area'
import { polygon as turfPolygon } from '@turf/helpers'
import turfKinks from '@turf/kinks'
import turfSimplify from '@turf/simplify'
import type { CoverageAreaResponse, GeoPoint } from '@/api/types'

/**
 * Coverage geometry for the map editor (ported from the admin dashboard's coverage feature).
 * Imported only by the lazily loaded editor, so turf stays out of every other chunk.
 */

export const RIYADH: [number, number] = [24.7136, 46.6753]
export const RIYADH_ZOOM = 11

export const MIN_POLYGON_POINTS = 3
export const MAX_POLYGON_POINTS = 200

/** GeoJSON ring (lng, lat), closed. */
function ring(points: GeoPoint[]): number[][] {
  const coords = points.map((p) => [p.longitude, p.latitude])
  if (coords.length) coords.push([...coords[0]!])
  return coords
}

export function polygonAreaKm2(points: GeoPoint[]): number {
  if (points.length < 3) return 0
  return turfArea(turfPolygon([ring(points)])) / 1_000_000
}

export function circleAreaKm2(radiusKm: number): number {
  return Math.PI * radiusKm * radiusKm
}

export function areaSizeKm2(area: Pick<CoverageAreaResponse, 'shape' | 'polygon' | 'radiusKm'>): number | null {
  if (area.shape === 'Polygon') return polygonAreaKm2(area.polygon)
  if (area.shape === 'Circle' && area.radiusKm) return circleAreaKm2(area.radiusKm)
  return null
}

export type PolygonProblem = 'TooFewPoints' | 'SelfIntersecting' | 'ZeroArea' | null

/** True when every point lies on the line through the first two distinct points (planar, in degrees). */
function allCollinear(points: GeoPoint[]): boolean {
  const a = points[0]!
  const b = points.find((p) => p.latitude !== a.latitude || p.longitude !== a.longitude)
  if (!b) return true
  const scale = Math.hypot(b.latitude - a.latitude, b.longitude - a.longitude)
  return points.every(
    (p) => Math.abs((b.longitude - a.longitude) * (p.latitude - a.latitude) - (b.latitude - a.latitude) * (p.longitude - a.longitude)) / scale < 1e-9,
  )
}

/**
 * Client pre-validation mirroring the server (`PolygonPointsCount`, `PolygonDegenerate`) plus a
 * self-intersection check: 3..200 points (simplifying with a growing tolerance above 200), no
 * crossing edges, area > 0. Order: collinear → kinks → area. Returns the (possibly simplified)
 * open ring.
 */
export function preparePolygon(input: GeoPoint[]): { points: GeoPoint[]; problem: PolygonProblem; simplified: boolean } {
  // Drop consecutive duplicates and a closing duplicate.
  let points = input.filter((p, i, all) => i === 0 || p.latitude !== all[i - 1]!.latitude || p.longitude !== all[i - 1]!.longitude)
  if (points.length > 1) {
    const first = points[0]!
    const last = points[points.length - 1]!
    if (first.latitude === last.latitude && first.longitude === last.longitude) points = points.slice(0, -1)
  }
  if (points.length < MIN_POLYGON_POINTS) return { points, problem: 'TooFewPoints', simplified: false }

  let simplified = false
  if (points.length > MAX_POLYGON_POINTS) {
    let tolerance = 0.0001
    let current = points
    while (current.length > MAX_POLYGON_POINTS && tolerance < 1) {
      const s = turfSimplify(turfPolygon([ring(points)]), { tolerance, highQuality: true })
      const coords = (s.geometry.coordinates[0] ?? []).slice(0, -1)
      current = coords.map(([lng, lat]) => ({ latitude: lat!, longitude: lng! }))
      tolerance *= 2
    }
    points = current
    simplified = true
    if (points.length < MIN_POLYGON_POINTS) return { points, problem: 'TooFewPoints', simplified }
  }

  // A flat ring (all points on one line) also "self-intersects"; report it as zero area.
  if (allCollinear(points)) return { points, problem: 'ZeroArea', simplified }
  const poly = turfPolygon([ring(points)])
  if (turfKinks(poly).features.length > 0) return { points, problem: 'SelfIntersecting', simplified }
  if (turfArea(poly) <= 1) return { points, problem: 'ZeroArea', simplified }
  return { points, problem: null, simplified }
}

/** Coordinates are always shown LTR with 5 decimals. */
export function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
