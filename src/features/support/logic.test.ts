import { describe, expect, it } from 'vitest'
import type { SupportEventResponse, SupportMessageResponse } from '@/api/types'
import { toFormData } from './api'
import { addFiles, namePastedFile, SUPPORT_CATEGORIES, supportFileProblem, supportTimeline } from './logic'

const f = (name: string, size = 1000) => ({ name, size })

describe('support attachments', () => {
  it('accepts jpg/png/webp/pdf up to 5 MB', () => {
    expect(supportFileProblem(f('shot.PNG'))).toBeNull()
    expect(supportFileProblem(f('a.pdf'))).toBeNull()
    expect(supportFileProblem(f('a.gif'))).toBe('BadExtension')
    expect(supportFileProblem(f('a.jpg', 6 * 1024 * 1024))).toBe('TooLarge')
  })

  it('adds up to five files and reports what it skipped', () => {
    expect(addFiles([], [f('a.jpg'), f('b.exe'), f('c.png')])).toEqual({ files: [f('a.jpg'), f('c.png')], problem: 'BadExtension' })
    const four = [f('1.jpg'), f('2.jpg'), f('3.jpg'), f('4.jpg')]
    expect(addFiles(four, [f('5.jpg'), f('6.jpg')])).toEqual({ files: [...four, f('5.jpg')], problem: 'TooMany' })
  })

  it('names a pasted screenshot', () => {
    const pasted = namePastedFile(new File(['x'], 'image.png', { type: 'image/png' }), new Date('2026-10-19T08:30:05Z'))
    expect(pasted.name).toBe('screenshot-20261019083005.png')
    expect(namePastedFile(new File(['x'], 'report.pdf', { type: 'application/pdf' })).name).toBe('report.pdf')
  })

  it('sends repeated files fields and leaves empty values out', () => {
    const form = toFormData({ subject: 'x', priority: '', serviceItemId: null }, [new File(['a'], 'a.png'), new File(['b'], 'b.png')])
    expect(form.get('subject')).toBe('x')
    expect(form.has('priority')).toBe(false)
    expect(form.has('serviceItemId')).toBe(false)
    expect(form.getAll('files')).toHaveLength(2)
  })

  it('offers the platform categories only', () => {
    expect(SUPPORT_CATEGORIES).toEqual(['Bug', 'Access', 'Data', 'Payment', 'FeatureRequest', 'Other'])
  })
})

describe('support timeline', () => {
  const message = (id: string, at: string, over: Partial<SupportMessageResponse> = {}): SupportMessageResponse => ({
    id,
    authorSide: 'Staff',
    authorName: 'فريق الدعم',
    isMine: false,
    body: id,
    isInternal: false,
    attachments: [],
    createdAt: at,
    ...over,
  })
  const event = (type: SupportEventResponse['type'], at: string, note: string | null = null): SupportEventResponse => ({
    type,
    fromValue: 'New',
    toValue: 'WaitingForReply',
    note,
    actorName: null,
    isInternal: false,
    createdAt: at,
  })

  it('merges messages and status changes, oldest first', () => {
    const entries = supportTimeline(
      [message('m2', '2026-10-19T10:00:00Z'), message('m1', '2026-10-19T08:00:00Z', { authorSide: 'Requester' })],
      [event('Created', '2026-10-19T07:00:00Z'), event('StatusChanged', '2026-10-19T09:00:00Z', 'نحتاج لقطة شاشة')],
    )
    expect(entries.map((e) => ('message' in e ? e.message.id : `status:${e.event.note}`))).toEqual(['m1', 'status:نحتاج لقطة شاشة', 'm2'])
  })

  it('never shows internal entries', () => {
    expect(supportTimeline([message('n', '2026-10-19T08:00:00Z', { isInternal: true })], [{ ...event('StatusChanged', '2026-10-19T09:00:00Z'), isInternal: true }])).toEqual([])
  })
})
