/**
 * Every localStorage read and write goes through here, under an env-supplied prefix, so a dev
 * and a production build on the same origin never read each other's session. Every accessor is
 * wrapped: storage can be unavailable (private mode, blocked site data) and that must never
 * break a render or a request.
 */

const PREFIX = String(import.meta.env.VITE_STORAGE_PREFIX ?? 'siana.provider')

export function storageKey(name: string): string {
  return `${PREFIX}.${name}`
}

export function readItem<T>(name: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storageKey(name))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeItem(name: string, value: unknown): void {
  try {
    window.localStorage.setItem(storageKey(name), JSON.stringify(value))
  } catch {
    // ignored — see module comment
  }
}

export function removeItem(name: string): void {
  try {
    window.localStorage.removeItem(storageKey(name))
  } catch {
    // ignored
  }
}
