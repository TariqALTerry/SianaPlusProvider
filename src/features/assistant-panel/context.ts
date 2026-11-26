import type { StaffAssistantContext, StaffAssistantSectionResponse } from '@/api/types'
import { ENTITY_ROUTES } from './config'

/** The page the assistant is opened from: the path, and the record of a detail page (or `?open=<id>` drawers). */
export function contextFor(pathname: string, search = '', branchId: string | null = null): StaffAssistantContext {
  const route = (pathname + search).slice(0, 300)
  for (const { pattern, type } of ENTITY_ROUTES) {
    const match = pathname.match(pattern)
    if (match?.[1]) return { route, entityType: type, entityId: match[1], branchId }
  }
  return { route, entityType: null, entityId: null, branchId }
}

/** The section that owns a path: the longest matching route prefix of the visible sections, else general. */
export function sectionFor(pathname: string, sections: readonly StaffAssistantSectionResponse[]): string {
  let best = 'general'
  let length = 0
  for (const section of sections) {
    if (section.key === 'general') continue
    for (const prefix of section.routes) {
      if (prefix === '/') continue
      if ((pathname === prefix || pathname.startsWith(prefix + '/')) && prefix.length > length) {
        best = section.key
        length = prefix.length
      }
    }
  }
  return best
}

/** A link the panel may follow: a path of this app, never another origin. */
export function isSafeRoute(route: string | null | undefined): route is string {
  return !!route && route.startsWith('/') && !route.startsWith('//') && !route.includes('://') && !route.includes('\\') && route.length <= 300
}
