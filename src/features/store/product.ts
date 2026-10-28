/** Stock movement helpers (§3.4); the product form itself lives in `productForm.ts`. */

export type StockDeltaCheck = { ok: true; delta: number; next: number } | { ok: false; reason: 'empty' | 'invalid' | 'negative'; next: number }

/** `PATCH …/stock { delta }`: a non-zero whole number that doesn't take stock below zero (`InsufficientStock`). */
export function checkStockDelta(raw: string, current: number): StockDeltaCheck {
  const s = raw.trim()
  if (s === '') return { ok: false, reason: 'empty', next: current }
  const delta = Number(s)
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, reason: 'invalid', next: current }
  const next = current + delta
  if (next < 0) return { ok: false, reason: 'negative', next }
  return { ok: true, delta, next }
}

/** `InsufficientStock` error data. */
export function insufficientStockAvailable(details: unknown): number | null {
  if (details && typeof details === 'object' && 'available' in details) {
    const n = (details as { available: unknown }).available
    return typeof n === 'number' ? n : null
  }
  return null
}
