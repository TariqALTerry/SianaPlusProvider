/**
 * Root query keys, one per resource. Features build narrower keys under these so invalidation
 * can be targeted by prefix — never a global `invalidateQueries()`.
 */
export const qk = {
  me: ['auth', 'me'],
  organization: ['organization'],
  dashboard: ['dashboard'],
  incoming: ['incoming'],
  work: ['work'],
  board: ['board'],
  workshop: ['workshop'],
  team: ['team'],
  marketplace: ['marketplace'],
  settlements: ['settlements'],
  reviews: ['reviews'],
  disputes: ['disputes'],
  store: ['store'],
  catalog: ['catalog'],
  notifications: ['notifications'],
  wallet: ['wallet'],
  messages: ['messages'],
  insights: ['insights'],
} as const satisfies Record<string, readonly string[]>
