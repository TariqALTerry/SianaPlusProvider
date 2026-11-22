import type { ServiceCallResponse } from '@/api/types'

/** Talk time as mm:ss; only answered calls have any (others show "—"). */
export function formatCallDuration(call: Pick<ServiceCallResponse, 'outcome' | 'durationSeconds'>): string {
  if (call.outcome !== 'Answered') return '—'
  const s = Math.max(0, Math.round(call.durationSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
