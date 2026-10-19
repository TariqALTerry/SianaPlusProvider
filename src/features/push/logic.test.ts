import { describe, expect, it } from 'vitest'
import { qk } from '@/api/keys'
import { notificationHref } from '@/features/notifications/api'
import { referenceQueryKeys } from './logic'
import { promptSnoozed, snoozePrompt, useWebPush, webPushConfigured } from './webPush'

describe('push destinations (PHASE2 §8)', () => {
  it('opens the platform page for each reference type', () => {
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1' })).toBe('/work/s1')
    // Service-tracking alerts (72 h without an update, return trip needed) open the tracking tab.
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1', title: 'لا تحديث على صيانة غسالة' })).toBe('/work/s1?tab=tracking')
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1', title: 'رتّب إرجاع صيانة غسالة' })).toBe('/work/s1?tab=tracking')
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1', title: 'Plan the return of Washer repair' })).toBe('/work/s1?tab=tracking')
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1', title: 'No update on Washer repair' })).toBe('/work/s1?tab=tracking')
    expect(notificationHref({ referenceType: 'ServiceItem', referenceId: 's1', title: 'خدمة جديدة: صيانة غسالة' })).toBe('/work/s1')
    expect(notificationHref({ referenceType: 'ServiceItemConversation', referenceId: 's1' })).toBe('/messages/s1')
    expect(notificationHref({ referenceType: 'ProviderWithdrawal', referenceId: 'w1' })).toBe('/wallet?tab=withdrawals')
    expect(notificationHref({ referenceType: 'Settlement', referenceId: 'st' })).toBe('/settlements/st')
    expect(notificationHref({ referenceType: 'MarketplaceRequest', referenceId: 'm' })).toBe('/marketplace/m')
    expect(notificationHref({ referenceType: 'Dispute', referenceId: 'd' })).toBe('/disputes/d')
    expect(notificationHref({ referenceType: 'SupportTicket', referenceId: 't1' })).toBe('/support/t1')
    expect(notificationHref({ referenceType: 'Unknown', referenceId: 'x' })).toBeNull()
  })

  it('refreshes the data behind each destination', () => {
    expect(referenceQueryKeys('ServiceItemConversation')).toEqual([qk.messages])
    expect(referenceQueryKeys('SupportTicket')).toEqual([qk.support])
    expect(referenceQueryKeys('ProviderWithdrawal')).toContain(qk.wallet)
    expect(referenceQueryKeys(null)).toEqual([])
  })
})

describe('web push without VITE_FIREBASE_* values', () => {
  it('stays hidden', () => {
    expect(webPushConfigured).toBe(false)
    expect(useWebPush.getState().state).toBe('hidden')
  })

  it('"later" hides the prompt for 7 days', () => {
    const now = Date.UTC(2026, 9, 15)
    snoozePrompt(now)
    expect(promptSnoozed(now + 6 * 86_400_000)).toBe(true)
    expect(promptSnoozed(now + 8 * 86_400_000)).toBe(false)
  })
})
