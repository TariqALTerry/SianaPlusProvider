import type { CoverageAreaRequest, CoverageAreaResponse, GeoPoint, ProviderDocumentStatus, PublicCapabilityResponse } from '@/api/types'
import { parseUtc } from '@/lib/format'

// ── Tabs (§8.9) ─────────────────────────────────────────────────────────────

export const ORGANIZATION_TABS = ['profile', 'documents', 'capabilities', 'coverage', 'operations', 'model'] as const
export type OrganizationTab = (typeof ORGANIZATION_TABS)[number]

export function parseTab(raw: string | null | undefined): OrganizationTab {
  return (ORGANIZATION_TABS as readonly string[]).includes(raw ?? '') ? (raw as OrganizationTab) : 'profile'
}

/** Deep link to one section of ملف المنشأة. */
export function organizationTabHref(tab: OrganizationTab): string {
  return `/organization?tab=${tab}`
}

// ── Capabilities ────────────────────────────────────────────────────────────

/** Main categories, in the order customers see them (§8.9). */
export const CAPABILITY_GROUPS = ['appliances', 'home', 'cleaning', 'general'] as const
export type CapabilityGroup = (typeof CAPABILITY_GROUPS)[number]

/**
 * Groups the catalog by main category. A capability serving several categories appears in each
 * of them (the selection is shared by id); one serving none, or only an unknown category, lands
 * in "general" so it is never unreachable.
 */
export function groupCapabilities(capabilities: readonly PublicCapabilityResponse[]): Record<CapabilityGroup, PublicCapabilityResponse[]> {
  const groups: Record<CapabilityGroup, PublicCapabilityResponse[]> = { appliances: [], home: [], cleaning: [], general: [] }
  for (const c of capabilities) {
    const known = [...new Set(c.categoryCodes)].filter((code): code is CapabilityGroup => (CAPABILITY_GROUPS as readonly string[]).includes(code))
    const targets: CapabilityGroup[] = known.length ? known : ['general']
    for (const g of targets) groups[g].push(c)
  }
  return groups
}

/** What a full-replace save changes, relative to the server's current set. */
export function capabilityChanges(currentIds: readonly string[], selectedIds: readonly string[]): { added: string[]; removed: string[] } {
  const current = new Set(currentIds)
  const selected = new Set(selectedIds)
  return {
    added: [...selected].filter((id) => !current.has(id)),
    removed: [...current].filter((id) => !selected.has(id)),
  }
}

// ── Documents ───────────────────────────────────────────────────────────────

export const EXPIRY_WARNING_DAYS = 30

export type ExpiryState = { kind: 'expired' } | { kind: 'soon'; days: number } | null

/** Expired, or expiring within 30 days (§8.9 "warn when expiresAt is within 30 days"). */
export function expiryState(expiresAt: string | null | undefined, now = Date.now()): ExpiryState {
  const end = parseUtc(expiresAt)
  if (!end) return null
  const ms = end.valueOf() - now
  if (ms <= 0) return { kind: 'expired' }
  const days = Math.ceil(ms / 86_400_000)
  return days <= EXPIRY_WARNING_DAYS ? { kind: 'soon', days } : null
}

/** The server deletes only what it has not accepted (`DocumentLocked` otherwise). */
export function canDeleteDocument(status: ProviderDocumentStatus): boolean {
  return status === 'Pending' || status === 'Rejected'
}

// ── Coverage ────────────────────────────────────────────────────────────────

export type AreaKind = 'Polygon' | 'Circle' | 'CityDistrict'

export type DraftGeometry =
  | { kind: 'Polygon'; points: GeoPoint[] }
  | { kind: 'Circle'; latitude: number; longitude: number; radiusKm: number }

export interface AreaLabels {
  name: string
  city: string
  district: string
}

export const MIN_RADIUS_KM = 0.1
export const MAX_RADIUS_KM = 500

export function clampRadiusKm(km: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(km * 100) / 100))
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6
const blankToNull = (s: string) => (s.trim() ? s.trim() : null)

/**
 * The `CoverageAreaRequest` for a save. The server derives the shape from what is sent — a
 * polygon wins, then latitude + longitude + radius, otherwise city/district — so each kind sends
 * only its own geometry. `polygon` is left out unless it has a real ring: an empty array is never
 * sent. A city/district area keeps an existing map pin (`pin`) without a radius.
 */
export function buildCoverageRequest(
  kind: AreaKind,
  labels: AreaLabels,
  geometry: DraftGeometry | null,
  pin?: { latitude: number | null; longitude: number | null } | null,
): CoverageAreaRequest {
  const base: CoverageAreaRequest = { name: blankToNull(labels.name), city: labels.city.trim(), district: blankToNull(labels.district) }

  if (kind === 'Polygon' && geometry?.kind === 'Polygon' && geometry.points.length >= 3) {
    return { ...base, polygon: geometry.points.map((p) => ({ latitude: round6(p.latitude), longitude: round6(p.longitude) })) }
  }
  if (kind === 'Circle' && geometry?.kind === 'Circle') {
    return { ...base, latitude: round6(geometry.latitude), longitude: round6(geometry.longitude), radiusKm: clampRadiusKm(geometry.radiusKm) }
  }
  if (kind === 'CityDistrict' && pin && pin.latitude != null && pin.longitude != null) {
    return { ...base, latitude: pin.latitude, longitude: pin.longitude }
  }
  return base
}

/** Editable geometry of a saved area (city/district areas have none). */
export function areaGeometry(area: CoverageAreaResponse): DraftGeometry | null {
  if (area.shape === 'Polygon' && area.polygon.length >= 3) return { kind: 'Polygon', points: area.polygon }
  if (area.shape === 'Circle' && area.latitude != null && area.longitude != null && area.radiusKm) {
    return { kind: 'Circle', latitude: area.latitude, longitude: area.longitude, radiusKm: area.radiusKm }
  }
  return null
}

/** Removing this area would leave no active one, so the onboarding step "مناطق التغطية" reopens. */
export function isLastActiveArea(areas: readonly CoverageAreaResponse[], id: string): boolean {
  const active = areas.filter((a) => a.isActive)
  return active.length === 1 && active[0]!.id === id
}
