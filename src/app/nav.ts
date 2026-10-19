import {
  Bell,
  Building2,
  Gavel,
  Home,
  Inbox,
  LifeBuoy,
  BarChart3,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  MessagesSquare,
  MessageSquareWarning,
  ReceiptText,
  ShoppingBag,
  Warehouse,
  Star,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ProviderContext } from './provider'

export type NavBadge = 'incoming' | 'messages' | 'support'

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
  /** An indented entry under the item above it (e.g. الأداء under الفريق). */
  sub?: boolean
}

/** The deep sidebar, in the brief's order (§8). */
export const NAV: readonly NavItem[] = [
  { to: '/', label: 'home', icon: Home, end: true, always: true },
  { to: '/incoming', label: 'incoming', icon: Inbox, badge: 'incoming' },
  { to: '/work', label: 'work', icon: ListChecks },
  { to: '/board', label: 'board', icon: LayoutDashboard },
  // Devices away from their customers (service tracking).
  { to: '/workshop', label: 'workshop', icon: Warehouse },
  { to: '/messages', label: 'messages', icon: MessagesSquare, badge: 'messages' },
  { to: '/team', label: 'team', icon: Users },
  // Under الفريق (PHASE2 §4, §6).
  { to: '/team/performance', label: 'teamPerformance', icon: BarChart3, sub: true },
  { to: '/team/map', label: 'teamMap', icon: MapIcon, sub: true },
  { to: '/marketplace', label: 'marketplace', icon: Gavel, visible: (c) => c.marketplaceEnabled },
  { to: '/wallet', label: 'wallet', icon: Wallet },
  { to: '/settlements', label: 'settlements', icon: ReceiptText },
  { to: '/reviews', label: 'reviews', icon: Star },
  { to: '/disputes', label: 'disputes', icon: MessageSquareWarning },
  { to: '/store', label: 'store', icon: ShoppingBag, visible: (c) => c.storeEnabled },
  // النمو (PHASE2 §3).
  { to: '/growth/demand', label: 'growthDemand', icon: TrendingUp },
  { to: '/organization', label: 'organization', icon: Building2, always: true },
  // Support tickets (SUPPORT-TICKETS-PROVIDER-PLATFORM-PROMPT): in every mode, with the unread count.
  { to: '/support', label: 'support', icon: LifeBuoy, badge: 'support', always: true },
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
