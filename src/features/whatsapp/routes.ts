import type { RouteObject } from 'react-router'
import type { RouteAccess } from '@/app/nav'

/** `/settings/whatsapp` (phase 4 §5): the owner and supervisors once the organization is Approved/Trial. */
const handle: RouteAccess = { full: true }

export const whatsappRoutes: RouteObject[] = [
  { path: 'settings/whatsapp', handle, lazy: () => import('./WhatsAppPage').then((m) => ({ Component: m.WhatsAppPage })) },
]
