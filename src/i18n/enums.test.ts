import { describe, expect, it } from 'vitest'
import * as generated from '@/api/types.gen'
import { enumLabel, enumMaps, enumTone, type EnumEntry } from './enums'

/** Backend enums the provider platform never renders. */
/** Backend enums this platform never shows (other apps' features, internal states). */
const NOT_DISPLAYED = new Set([
  // The customer store catalog sort (SMART-STORE-MOBILE-PROMPT).
  'StoreProductSort',
  'AuditAction', 'FileCategory', 'OtpPurpose',
  'AiProvider', 'AiReviewRating', 'AiReviewTag', 'AppExperience', 'HomeBannerActionType', 'NotificationPushStatus',
  'AssistantConversationStatus', 'AssistantMessageRole', 'AssistantCardType', 'AssistantStage', 'AssistantOutcome',
  'AvailabilityAlertStatus', 'AvailabilityAlertSource', 'ConversationContext', 'ProviderWithdrawalState',
  'CommunityMemberType', 'CommunityMemberStatus', 'PartCondition', 'PartPriceType', 'PartListingStatus', 'PartRequestStatus',
  'PartRequestCloseReason', 'PartOfferStatus', 'CommunityPostType', 'CommunityMediaType', 'CommunityTargetType',
  'CommunityReportReason', 'CommunityReportStatus', 'CommunityReportAction', 'CommunitySavedType', 'CommunityListingSort',
  'CommunityPostFilter', 'ServiceImageJobStatus',
  // «أمان بيتك» plans and subscriptions are the platform's; the provider only sees covered items.
  'HomeSubscriptionStatus', 'SubscriptionEntitlementKind',
])

const generatedEnums = Object.entries(generated)
  .filter(([key, value]) => key.endsWith('Values') && Array.isArray(value))
  .map(([key, value]) => [key.slice(0, -'Values'.length), value as readonly string[]] as const)

describe('enum label maps', () => {
  it('found the generated enums', () => {
    expect(generatedEnums.length).toBeGreaterThan(30)
  })

  it.each(generatedEnums.filter(([name]) => !NOT_DISPLAYED.has(name)))('%s: every backend value has an Arabic and English label', (name, values) => {
    const map = (enumMaps as Record<string, Record<string, EnumEntry>>)[name]
    expect(map, `missing label map for ${name}`).toBeDefined()
    for (const value of values) {
      expect(map![value], `${name}.${value}`).toBeDefined()
      expect(map![value]!.ar.trim(), `${name}.${value} ar`).not.toBe('')
      expect(map![value]!.en.trim(), `${name}.${value} en`).not.toBe('')
    }
  })

  it('has no labels for values the backend does not have', () => {
    for (const [name, map] of Object.entries(enumMaps)) {
      const values = generatedEnums.find(([n]) => n === name)?.[1]
      expect(values, `generated enum ${name}`).toBeDefined()
      for (const key of Object.keys(map)) expect(values).toContain(key)
    }
  })

  it('never crashes on unknown values', () => {
    expect(enumLabel('ServiceItemStatus', 'BrandNewStatus', 'ar')).toBe('BrandNewStatus')
    expect(enumTone('ServiceItemStatus', 'BrandNewStatus')).toBe('neutral')
    expect(enumLabel('ServiceItemStatus', null, 'ar')).toBe('—')
  })

  it('uses the provider wording from §9 of the brief', () => {
    expect(enumLabel('ServiceItemStatus', 'AssignedToProvider', 'ar')).toBe('بانتظار اختيار فني')
    expect(enumLabel('ServiceItemStatus', 'Rejected', 'ar')).toBe('اعتذر الفني — اختر غيره')
    expect(enumLabel('ServiceItemStatus', 'Disputed', 'ar')).toBe('عليها شكوى')
    expect(enumLabel('SettlementStatus', 'Paid', 'ar')).toBe('مصروفة')
    expect(enumLabel('DisputeStatus', 'Rejected', 'ar')).toBe('مغلقة')
    expect(enumTone('ServiceItemStatus', 'Rejected')).toBe('danger')
  })
})
