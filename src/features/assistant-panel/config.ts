/**
 * What makes this panel the provider platform's (AI-STAFF-ASSISTANT-PROVIDER-PLATFORM-PROMPT): its API, how a page path names the
 * record on screen, and the storage key. The same panel as the admin dashboard's (`Siana-Dashboard/src/features/assistant-panel`).
 */
export const ASSISTANT_BASE = '/api/provider/assistant'

export const STORAGE_KEY = 'staffAssistant'

/** A detail page's path → the record the assistant should treat as "this" (`entityType`, `entityId`). */
export const ENTITY_ROUTES: ReadonlyArray<{ pattern: RegExp; type: string }> = [
  { pattern: /^\/work\/([0-9a-f-]{36})/i, type: 'serviceItem' },
  { pattern: /^\/counter\/items\/([0-9a-f-]{36})/i, type: 'serviceItem' },
  { pattern: /^\/messages\/([0-9a-f-]{36})/i, type: 'serviceItem' },
  { pattern: /^\/team\/([0-9a-f-]{36})/i, type: 'executor' },
  { pattern: /^\/disputes\/([0-9a-f-]{36})/i, type: 'dispute' },
  { pattern: /^\/support\/([0-9a-f-]{36})/i, type: 'ticket' },
  { pattern: /^\/settlements\/([0-9a-f-]{36})/i, type: 'settlement' },
  { pattern: /^\/marketplace\/([0-9a-f-]{36})/i, type: 'marketplaceRequest' },
  { pattern: /^\/store\/products\/([0-9a-f-]{36})/i, type: 'product' },
]
