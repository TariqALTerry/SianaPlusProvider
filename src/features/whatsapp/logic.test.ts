import { describe, expect, it } from 'vitest'
import type { ProviderWhatsAppResponse } from '@/api/types'
import { changesVerification, linkDraft, linkProblems, linkRequest, senderLabel } from './logic'

const saved = { phoneNumberId: '123', wabaId: '456', language: 'ar', enabled: true } as ProviderWhatsAppResponse

describe('own WhatsApp number (phase 4 §5)', () => {
  it('the first save needs both ids and the token; ids are digits only', () => {
    const empty = linkDraft(undefined)
    expect(linkProblems(empty, false)).toEqual(['phoneNumberId', 'wabaId', 'accessToken'])
    expect(linkProblems({ ...empty, phoneNumberId: '12a', wabaId: '9', accessToken: 'x' }, false)).toEqual(['phoneNumberId'])
    expect(linkProblems({ ...empty, phoneNumberId: '1', wabaId: '9', accessToken: 'x', language: 'arabic!' }, false)).toEqual(['language'])
  })

  it('once linked, a blank token keeps the saved one', () => {
    const d = linkDraft(saved)
    expect(d.accessToken).toBe('')
    expect(linkProblems(d, true)).toEqual([])
    const body = linkRequest(d)
    expect(body.accessToken).toBeNull()
    expect(body.appSecret).toBeNull()
    expect(body).toMatchObject({ phoneNumberId: '123', wabaId: '456', enabled: true, clearAppSecret: false })
  })

  it('clearing the secret never sends one', () => {
    expect(linkRequest({ ...linkDraft(saved), appSecret: 'abc', clearAppSecret: true }).appSecret).toBeNull()
  })

  it('knows when a save will need a new test', () => {
    expect(changesVerification(linkDraft(saved), saved)).toBe(false)
    expect(changesVerification({ ...linkDraft(saved), accessToken: 'new' }, saved)).toBe(true)
    expect(changesVerification({ ...linkDraft(saved), wabaId: '999' }, saved)).toBe(true)
  })

  it('names the active sender', () => {
    expect(senderLabel({ activeSender: 'Provider' })).toBe('provider')
    expect(senderLabel({ activeSender: 'Platform' })).toBe('platform')
    expect(senderLabel({ activeSender: null })).toBe('none')
  })
})
