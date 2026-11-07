import {
  AlarmClockCheck,
  Bell,
  Building2,
  CreditCard,
  ScanBarcode,
  Gavel,
  HandCoins,
  ShieldCheck,
  Home,
  Inbox,
  LifeBuoy,
  BarChart3,
  ArrowLeftRight,
  Boxes,
  Kanban,
  MessageCircle,
  ShieldPlus,
  Vault,
  PieChart,
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
import type { ProviderContext, ShellContext } from './provider'

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
  /** Shown before approval too when this says so (the plans page for a "counter only" shop). */
  early?: (ctx: ProviderContext) => boolean
  /** An indented entry under the item above it (e.g. الأداء under الفريق). */
  sub?: boolean
}

/** The deep sidebar, in the brief's order (§8). */
export const NAV: readonly NavItem[] = [
  { to: '/', label: 'home', icon: Home, end: true, always: true },
  // Platform work only: hidden for a "counter only" shop (PROVIDER-BRANCHES phase 3 §7).
  { to: '/incoming', label: 'incoming', icon: Inbox, badge: 'incoming', visible: (c) => !c.counterOnly },
  // Walk-in devices at the shop counter (PROVIDER-BRANCHES phase 2). The page itself shows the subscription gate.
  { to: '/counter', label: 'counter', icon: ScanBarcode },
  // Branch operations (phase 5) under الكاونتر.
  { to: '/counter/board', label: 'counterBoard', icon: Kanban, sub: true },
  { to: '/counter/transfers', label: 'transfers', icon: ArrowLeftRight, sub: true },
  { to: '/counter/warranty', label: 'counterWarranty', icon: ShieldPlus, sub: true },
  { to: '/counter/cash-close', label: 'cashClose', icon: Vault, sub: true },
  { to: '/insights/counter', label: 'counterReport', icon: PieChart, sub: true },
  { to: '/work', label: 'work', icon: ListChecks },
  { to: '/board', label: 'board', icon: LayoutDashboard, visible: (c) => !c.counterOnly },
  // Devices away from their customers (service tracking).
  { to: '/workshop', label: 'workshop', icon: Warehouse },
  // Workshop parts per branch (phase 6), not the store's stock.
  { to: '/inventory', label: 'inventory', icon: Boxes },
  { to: '/messages', label: 'messages', icon: MessagesSquare, badge: 'messages' },
  { to: '/team', label: 'team', icon: Users },
  // Under الفريق (PHASE2 §4, §6, then the tracking pages).
  { to: '/team/performance', label: 'teamPerformance', icon: BarChart3, sub: true },
  { to: '/team/map', label: 'teamMap', icon: MapIcon, sub: true },
  // Tracking: punctuality, quality signals, cash still with technicians.
  { to: '/team/punctuality', label: 'teamPunctuality', icon: AlarmClockCheck, sub: true },
  { to: '/team/quality', label: 'teamQuality', icon: ShieldCheck, sub: true },
  { to: '/team/cash', label: 'teamCash', icon: HandCoins, sub: true },
  { to: '/marketplace', label: 'marketplace', icon: Gavel, visible: (c) => c.marketplaceEnabled },
  { to: '/wallet', label: 'wallet', icon: Wallet },
  // The counter's paid subscription (phase 3). A "counter only" shop may look at the plans before approval.
  { to: '/subscription', label: 'subscription', icon: CreditCard, early: (c) => c.counterOnly },
  // Automatic counter messages and the shop's own number (phase 4).
  { to: '/settings/whatsapp', label: 'whatsapp', icon: MessageCircle },
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

/**
 * A front-desk account's short menu (phase 2 §2): the counter and its branch pages (phase 5), the shelf, the parts in
 * stock read-only without costs (phase 6 §1) and notifications.
 */
export const FRONT_DESK_NAV: readonly NavItem[] = [
  { to: '/counter', label: 'counter', icon: ScanBarcode },
  { to: '/counter/board', label: 'counterBoard', icon: Kanban, sub: true },
  { to: '/counter/transfers', label: 'transfers', icon: ArrowLeftRight, sub: true },
  { to: '/counter/warranty', label: 'counterWarranty', icon: ShieldPlus, sub: true },
  { to: '/counter/cash-close', label: 'cashClose', icon: Vault, sub: true },
  { to: '/workshop', label: 'workshop', icon: Warehouse },
  { to: '/inventory', label: 'inventory', icon: Boxes },
  { to: '/notifications', label: 'notifications', icon: Bell },
]

export function visibleNav(ctx: ShellContext): NavItem[] {
  if (ctx.kind === 'frontDesk') return [...FRONT_DESK_NAV]
  return NAV.filter((item) => (ctx.mode === 'full' || item.always || !!item.early?.(ctx)) && (!item.visible || item.visible(ctx)))
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
  /** Platform-work pages (incoming, board): not for a "counter only" shop. */
  platform?: boolean
  /** Open to a front-desk account too. Every other page is closed to it (the server answers 403). */
  frontDesk?: boolean
  /** Open before approval when this says so (the plans page of a "counter only" shop). */
  early?: (ctx: ProviderContext) => boolean
}

export type RouteDenial = 'notApproved' | 'notAvailable' | null

export function routeDenial(access: RouteAccess | undefined, ctx: ShellContext): RouteDenial {
  if (ctx.kind === 'frontDesk') return access?.frontDesk ? null : 'notAvailable'
  if (!access) return null
  if (
    (access.marketplace && !ctx.marketplaceEnabled) ||
    (access.store && !ctx.storeEnabled) ||
    (access.ownerOnly && !ctx.isOwner) ||
    (access.platform && ctx.counterOnly)
  ) {
    return 'notAvailable'
  }
  if (access.full && ctx.mode !== 'full' && !access.early?.(ctx)) return 'notApproved'
  return null
}
