import { MAX_UPLOAD_BYTES } from '@/api/files'
import type { SupportEventResponse, SupportMessageResponse, SupportTicketCategory } from '@/api/types'

/** What the platform may pick (the server's DashboardTicket list; others answer `SupportCategoryNotAllowed`). */
export const SUPPORT_CATEGORIES: readonly SupportTicketCategory[] = ['Bug', 'Access', 'Data', 'Payment', 'FeatureRequest', 'Other']

/** Attachments: jpg/png/webp/pdf, ≤ 5 MB each, ≤ 5 per message. */
export const SUPPORT_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const
export const SUPPORT_MAX_FILES = 5
export const SUBJECT_MAX = 200
export const BODY_MAX = 4000

export type FileProblem = 'BadExtension' | 'TooLarge' | 'TooMany'

export function supportFileProblem(file: Pick<File, 'name' | 'size'>): Exclude<FileProblem, 'TooMany'> | null {
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  if (!(SUPPORT_FILE_EXTENSIONS as readonly string[]).includes(ext)) return 'BadExtension'
  if (file.size > MAX_UPLOAD_BYTES) return 'TooLarge'
  return null
}

/** Adds picked, dropped or pasted files: refused ones are skipped, and the list stops at 5. */
export function addFiles<F extends Pick<File, 'name' | 'size'>>(current: readonly F[], incoming: readonly F[]): { files: F[]; problem: FileProblem | null } {
  const files = [...current]
  let problem: FileProblem | null = null
  for (const file of incoming) {
    const bad = supportFileProblem(file)
    if (bad) {
      problem = bad
      continue
    }
    if (files.length >= SUPPORT_MAX_FILES) {
      problem = 'TooMany'
      break
    }
    files.push(file)
  }
  return { files, problem }
}

const MIME_EXT: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/pdf': '.pdf' }

/**
 * A pasted screenshot comes as `image.png` (or with no name at all): give it a readable name with the right
 * extension, so it passes the extension check and reads well in the list.
 */
export function namePastedFile(file: File, now = new Date()): File {
  const hasExt = /\.[a-z0-9]+$/i.test(file.name)
  if (hasExt && file.name !== 'image.png') return file
  const ext = MIME_EXT[file.type] ?? (hasExt ? file.name.slice(file.name.lastIndexOf('.')) : '')
  const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return new File([file], `screenshot-${stamp}${ext}`, { type: file.type })
}

export type TimelineEntry = { at: string; message: SupportMessageResponse } | { at: string; event: SupportEventResponse }

/** Messages and status changes (with their note) on one timeline, oldest first. */
export function supportTimeline(messages: readonly SupportMessageResponse[], events: readonly SupportEventResponse[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...messages.filter((m) => !m.isInternal).map((message) => ({ at: message.createdAt, message })),
    ...events.filter((e) => e.type === 'StatusChanged' && !e.isInternal).map((event) => ({ at: event.createdAt, event })),
  ]
  return entries.sort((a, b) => a.at.localeCompare(b.at))
}
