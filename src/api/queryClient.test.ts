import { describe, expect, it } from 'vitest'
import { isFirstLoad } from './queryClient'

describe('isFirstLoad', () => {
  const q = (over: Partial<{ isPending: boolean; isFetching: boolean; isFetchedAfterMount: boolean }> = {}) => ({
    isPending: false,
    isFetching: false,
    isFetchedAfterMount: true,
    ...over,
  })

  it('is loading until the first answer for these filters arrives (tester item 60)', () => {
    expect(isFirstLoad(q({ isPending: true }), true)).toBe(true)
    // The previous tab's empty page kept as placeholder, or an empty cached copy being refreshed.
    expect(isFirstLoad(q({ isFetching: true, isFetchedAfterMount: false }), true)).toBe(true)
  })

  it('keeps what is on screen otherwise', () => {
    expect(isFirstLoad(q({ isFetching: true, isFetchedAfterMount: false }), false)).toBe(false)
    expect(isFirstLoad(q({ isFetching: true }), true)).toBe(false) // polling an empty list
    expect(isFirstLoad(q(), true)).toBe(false)
  })
})
