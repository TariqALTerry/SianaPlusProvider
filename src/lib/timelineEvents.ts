import { formatNumber } from './format'

/**
 * Events whose label carries values read from the event's metadata. Each one has a second label in
 * `common:timelineEventDetails.<type>` with these placeholders; without every value the plain
 * `common:timelineEvents.<type>` label is shown instead, so a placeholder never shows raw.
 */
const DETAIL_VALUES: Record<string, readonly string[]> = {
  // The technician tapped "وصلت" far from the address and confirmed it (metadata: distanceKm, executorId).
  ArrivedFarFromAddress: ['distanceKm'],
}

/** The interpolation values for an event's detailed label, numbers formatted for the language; null for the plain label. */
export function eventLabelValues(type: string | null | undefined, metadataJson: string | null | undefined, language: string): Record<string, string> | null {
  const keys = type ? DETAIL_VALUES[type] : undefined
  if (!keys || !metadataJson) return null
  let meta: unknown
  try {
    meta = JSON.parse(metadataJson)
  } catch {
    return null
  }
  if (!meta || typeof meta !== 'object') return null
  const record = meta as Record<string, unknown>
  const values: Record<string, string> = {}
  for (const key of keys) {
    const raw = record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)]
    if (typeof raw === 'number' && Number.isFinite(raw)) values[key] = formatNumber(raw, language, Number.isInteger(raw) ? 0 : 1)
    else if (typeof raw === 'string' && raw.trim()) values[key] = raw.trim()
    else return null
  }
  return values
}
