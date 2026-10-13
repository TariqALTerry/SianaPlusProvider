import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * List state (filters, sort, page, page size) lives in the query string so a filtered view is
 * bookmarkable, shareable, and restored by Back (§2, §4.3).
 *
 * Declare a schema of defaults; string params stay strings, number defaults parse as numbers,
 * boolean defaults parse 'true'/'false', array defaults read repeated keys (`?status=A&status=B`).
 * Setting a filter resets `page` to 1 unless `page` itself is being set.
 */

export type UrlValue = string | number | boolean | string[]
export type UrlSchema = Record<string, UrlValue>

type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends readonly string[] ? string[] : T

export type UrlState<S extends UrlSchema> = { [K in keyof S]: Widen<S[K]> }

export const PAGE_SIZES = [25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

export const paginationDefaults: { page: number; pageSize: number } = { page: 1, pageSize: DEFAULT_PAGE_SIZE }

function parse(raw: string | null, all: string[], fallback: UrlValue): UrlValue {
  if (Array.isArray(fallback)) return all.length ? all : fallback
  if (raw === null) return fallback
  if (typeof fallback === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  }
  if (typeof fallback === 'boolean') return raw === 'true'
  return raw
}

export function useUrlState<S extends UrlSchema>(schema: S) {
  const [params, setParams] = useSearchParams()

  const state = useMemo(() => {
    const out = {} as Record<string, UrlValue>
    for (const [key, fallback] of Object.entries(schema)) {
      out[key] = parse(params.get(key), params.getAll(key), fallback)
    }
    if (typeof out.pageSize === 'number' && !(PAGE_SIZES as readonly number[]).includes(out.pageSize)) {
      out.pageSize = DEFAULT_PAGE_SIZE
    }
    return out as UrlState<S>
    // schema is a literal declared per page; its identity changing is not a state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const set = useCallback(
    (patch: Partial<UrlState<S>>, options: { replace?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            next.delete(key)
            const fallback = schema[key]
            const isDefault =
              value === undefined ||
              value === '' ||
              (Array.isArray(value) ? value.length === 0 && Array.isArray(fallback) && fallback.length === 0 : value === fallback)
            if (isDefault) continue
            if (Array.isArray(value)) value.forEach((v) => next.append(key, v))
            else next.set(key, String(value))
          }
          if (!('page' in patch) && 'page' in schema) next.delete('page')
          return next
        },
        { replace: options.replace ?? false },
      )
    },
    [schema, setParams],
  )

  /** Clears everything except the listed keys (tabs usually survive "clear filters"). */
  const reset = useCallback(
    (keep: Array<keyof S> = []) => {
      setParams((prev) => {
        const next = new URLSearchParams()
        for (const k of keep) prev.getAll(String(k)).forEach((v) => next.append(String(k), v))
        return next
      })
    },
    [setParams],
  )

  /** Keys that differ from their defaults, for the "active filters" chip row. */
  const active = useMemo(
    () =>
      (Object.keys(schema) as Array<keyof S & string>).filter((k) => {
        if (k === 'page' || k === 'pageSize') return false
        const v = state[k]
        const d = schema[k]
        return Array.isArray(v) ? v.length > 0 && JSON.stringify(v) !== JSON.stringify(d) : v !== d
      }),
    [schema, state],
  )

  return { state, set, reset, active }
}
