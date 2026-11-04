import { afterEach, describe, expect, it, vi } from 'vitest'
import { thumbUrl } from './files'

describe('thumbUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks the API for the smallest thumbnail that covers the box on this screen', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    expect(thumbUrl('/uploads/evidence/a.jpg', 36)).toMatch(/\/uploads\/evidence\/a\.jpg\?w=200$/)
    expect(thumbUrl('/uploads/evidence/a.jpg', 150)).toMatch(/\?w=400$/)
    expect(thumbUrl('/uploads/evidence/a.webp', 320)).toMatch(/\?w=800$/)
  })

  it('leaves anything else as it is', () => {
    vi.stubGlobal('devicePixelRatio', 1)
    expect(thumbUrl('/uploads/docs/a.pdf', 36)).not.toContain('?w=')
    expect(thumbUrl('/uploads/videos/a.mp4', 36)).not.toContain('?w=')
    expect(thumbUrl('https://cdn.example.com/a.jpg', 36)).toBe('https://cdn.example.com/a.jpg')
    expect(thumbUrl('/uploads/a.jpg?x=1', 36)).not.toContain('?w=')
    expect(thumbUrl('/uploads/a.jpg', 1000)).not.toContain('?w=') // needs more than the largest thumbnail
    expect(thumbUrl(null, 36)).toBeUndefined()
  })
})
