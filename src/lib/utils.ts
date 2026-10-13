import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Fraction (0.15) → percentage number (15), rounded to 2 decimals. */
export function toPercent(fraction: number | null | undefined): number | null {
  if (fraction === null || fraction === undefined) return null
  return Math.round(fraction * 10000) / 100
}

/** Percentage (15) → fraction (0.15). */
export function fromPercent(percent: number | null | undefined): number | null {
  if (percent === null || percent === undefined || Number.isNaN(percent)) return null
  return Math.round(percent * 100) / 10000
}

export function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + (pick(item) || 0), 0)
}

/** Safe ratio for rates; 0 when the denominator is 0. */
export function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

export function parseJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
