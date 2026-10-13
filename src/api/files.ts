import { API_ORIGIN } from './http'

/** Upload limits enforced by the server (§3.5 of the brief). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'] as const
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif'
export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.join(',')

export type UploadProblem = 'TooLarge' | 'BadExtension' | null

export function validateUpload(file: File, allowed: readonly string[] = ALLOWED_UPLOAD_EXTENSIONS): UploadProblem {
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
  if (!allowed.includes(ext)) return 'BadExtension'
  if (file.size > MAX_UPLOAD_BYTES) return 'TooLarge'
  return null
}

/** Server file URLs are relative (`/uploads/...`); absolute ones pass through. */
export function fileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

export function isPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url)
}

export function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)($|\?)/i.test(url)
}
