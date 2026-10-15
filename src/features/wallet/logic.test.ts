import { describe, expect, it } from 'vitest'
import { formatIban, isSaudiIban, normalizeIban, withdrawBlock } from './logic'

describe('IBAN', () => {
  it('formats in groups of four and normalizes for the server', () => {
    expect(formatIban('sa0380000000608010167519')).toBe('SA03 8000 0000 6080 1016 7519')
    expect(normalizeIban('SA03 8000 0000 6080 1016 7519')).toBe('SA0380000000608010167519')
  })

  it('accepts SA + 22 digits only', () => {
    expect(isSaudiIban('SA03 8000 0000 6080 1016 7519')).toBe(true)
    expect(isSaudiIban('SA0380000000608010167')).toBe(false)
    expect(isSaudiIban('AE070331234567890123456')).toBe(false)
    expect(isSaudiIban('SA03800000006080101675AB')).toBe(false)
  })
})

describe('withdrawBlock', () => {
  it('maps known reasons and tolerates new ones', () => {
    expect(withdrawBlock(null)).toBeNull()
    expect(withdrawBlock('BelowMinimum')).toBe('BelowMinimum')
    expect(withdrawBlock('SomethingNew')).toBe('Unknown')
  })
})
