import {
  Bell,
  Building2,
  Gavel,
  Home,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquareWarning,
  ReceiptText,
  ShoppingBag,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ProviderContext } from './provider'

export type NavBadge = 'incoming'

export interface NavItem {
  to: string
  /** Key under `nav.*`. */
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: NavBadge
  /** Shown in onboarding/review mode too (§8: only الرئيسية, ملف المنشأة, الإشعارات). */
  always?: boolean
  visible?: (ctx: ProviderContext) => boolean
}

/** The deep sidebar, in the brief's order (§8). */
export const NAV: readonly NavItem[] = [
  { to: '/', label: 'home', icon: Home, end: true, always: true },
  { to: '/incoming', label: 'incoming', icon: Inbox, badge: 'incoming' },
  { to: '/work', label: 'work', icon: ListChecks },
  { to: '/board', label: 'board', icon: LayoutDashboard },
  { to: '/team', label: 'team', icon: Users },
  { to: '/marketplace', label: 'marketplace', icon: Gavel, visible: (c) => c.marketplaceEnabled },
  { to: '/settlements', label: 'settlements', icon: ReceiptText },
  { to: '/reviews', label: 'reviews', icon: Star },
  { to: '/disputes', label: 'disputes', icon: MessageSquareWarning },
  { to: '/store', label: 'store', icon: ShoppingBag, visible: (c) => c.storeEnabled },
  { to: '/organization', label: 'organization', icon: Building2, always: true },
  { to: '/notifications', label: 'notifications', icon: Bell, always: true },
]

export function visibleNav(ctx: ProviderContext): NavItem[] {
  return NAV.filter((item) => (ctx.mode === 'full' || item.always) && (!item.visible || item.visible(ctx)))
}

/**
 * What a route needs, declared on its `handle` (checked by `RouteGuard`):
 * - `full`: hidden until the organization is Approved/Trial (work, team, settlements, …);
 * - `marketplace` / `store`: the business model / store flag;
 * - `ownerOnly`: owner-only pages (none today — owner-only *actions* are hidden in place).
 */
export interface RouteAccess {
  full?: boolean
  marketplace?: boolean
  store?: boolean
  ownerOnly?: boolean
}

export type RouteDenial = 'notApproved' | 'notAvailable' | null

export function routeDenial(access: RouteAccess | undefined, ctx: ProviderContext): RouteDenial {
  if (!access) return null
  if ((access.marketplace && !ctx.marketplaceEnabled) || (access.store && !ctx.storeEnabled) || (access.ownerOnly && !ctx.isOwner)) {
    return 'notAvailable'
  }
  if (access.full && ctx.mode !== 'full') return 'notApproved'
  return null
}
