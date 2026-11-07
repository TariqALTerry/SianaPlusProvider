import { describe, expect, it } from 'vitest'
import {
  accessAsOverview,
  balanceState,
  can,
  canAllowDebt,
  counterGate,
  daysToAbandon,
  discountProblem,
  abandonNeedsReason,
  EMPTY_PAUSE,
  holdActions,
  pauseProblems,
  pauseRequest,
  resendKinds,
  showStorage,
  whatsAppNotice,
  boardItemHref,
  stageShares,
  draftFromPrefill,
  EMPTY_INTAKE,
  intakeRequest,
  isPickupCode,
  isSubscriptionReason,
  maxDiscountAmount,
  paidNow,
  parseCounterTab,
  photosMissing,
  scanToSearch,
  stepProblems,
  tabCount,
  tabEnum,
  toggleFlag,
  CONDITIONS,
  batches,
  type IntakeDraft,
} from './logic'

const draft = (over: Partial<IntakeDraft> = {}): IntakeDraft => ({ ...EMPTY_INTAKE, branchId: 'b1', phone: '501234567', serviceId: 's1', ...over })
const branch = (over: Partial<{ isActive: boolean; counterEnabled: boolean }> = {}) => ({ isActive: true, counterEnabled: true, ...over })

describe('counter tabs (phase 2 §5)', () => {
  it('parses the tab, defaulting to received', () => {
    expect(parseCounterTab('ready')).toBe('ready')
    expect(parseCounterTab('awaitingCustomer')).toBe('awaitingCustomer')
    expect(parseCounterTab('nope')).toBe('received')
    expect(parseCounterTab(null)).toBe('received')
  })

  it('maps tabs to the CounterTab enum and counts', () => {
    expect(tabEnum('awaitingCustomer')).toBe('AwaitingCustomer')
    expect(tabEnum('all')).toBe('All')
    const counts = { received: 3, inProgress: 2, awaitingCustomer: 1, ready: 4, delivered: 5, incomplete: 2 }
    expect(tabCount('ready', counts)).toBe(4)
    expect(tabCount('all', counts)).toBeNull()
    expect(tabCount('ready', undefined)).toBeNull()
  })
})

describe('scanning a label or receipt QR', () => {
  it('keeps a plain intake number and trims it', () => {
    expect(scanToSearch('  RYD1-000123 ')).toBe('RYD1-000123')
    expect(scanToSearch('')).toBe('')
  })

  it('takes the last path segment of a link', () => {
    expect(scanToSearch('https://siana.example/r/RYD1-000123')).toBe('RYD1-000123')
    expect(scanToSearch('https://siana.example/r/RYD1-000123/')).toBe('RYD1-000123')
  })
})

describe('the counter gate (phase 2 §3, phase 3 §2)', () => {
  it('follows the server subscription gate first', () => {
    expect(counterGate({ overview: { counterAvailable: false, counterBlockedReason: 'CounterSubscriptionExpired' }, branch: branch(), branches: [branch()] })).toEqual({ open: false, reason: 'CounterSubscriptionExpired' })
    expect(counterGate({ overview: { counterAvailable: false, counterBlockedReason: 'CounterSubscriptionPendingPayment' }, branch: null, branches: [branch()] })).toEqual({ open: false, reason: 'CounterSubscriptionPendingPayment' })
    // Unknown or missing reasons read as "no subscription".
    expect(counterGate({ overview: { counterAvailable: false, counterBlockedReason: null }, branch: null, branches: [branch()] })).toEqual({ open: false, reason: 'CounterModuleDisabled' })
  })

  it('then the branch: stopped, counter off, or none running the counter', () => {
    const open = { counterAvailable: true, counterBlockedReason: null }
    expect(counterGate({ overview: open, branch: branch({ isActive: false }), branches: [branch()] })).toEqual({ open: false, reason: 'BranchInactive' })
    expect(counterGate({ overview: open, branch: branch({ counterEnabled: false }), branches: [branch()] })).toEqual({ open: false, reason: 'BranchCounterDisabled' })
    expect(counterGate({ overview: open, branch: null, branches: [branch({ counterEnabled: false })] })).toEqual({ open: false, reason: 'NoCounterBranch' })
    expect(counterGate({ overview: open, branch: null, branches: [] })).toEqual({ open: false, reason: 'NoBranch' })
    expect(counterGate({ overview: open, branch: branch(), branches: [branch()] })).toEqual({ open: true })
  })

  it('the front desk reads the same gate from me/branches (counter.available / reason)', () => {
    const closed = accessAsOverview({ available: false, reason: 'CounterSubscriptionExpired' })
    expect(counterGate({ overview: closed, branch: branch(), branches: [branch()] })).toEqual({ open: false, reason: 'CounterSubscriptionExpired' })
    expect(counterGate({ overview: accessAsOverview({ available: true, reason: null }), branch: branch(), branches: [branch()] })).toEqual({ open: true })
    // Not loaded yet: only the branch half.
    expect(accessAsOverview(undefined)).toBeNull()
  })

  it('for the front desk (no subscription read) only the branch decides', () => {
    expect(counterGate({ overview: null, branch: branch(), branches: [branch()] })).toEqual({ open: true })
    expect(counterGate({ overview: null, branch: branch({ counterEnabled: false }), branches: [branch({ counterEnabled: false })] }).open).toBe(false)
  })

  it('knows which reasons the subscription page answers', () => {
    expect(isSubscriptionReason('CounterSubscriptionExpired')).toBe(true)
    expect(isSubscriptionReason('BranchCounterDisabled')).toBe(false)
  })
})

describe('the new intake (phase 2 §4)', () => {
  it('checks the customer step: branch, Saudi mobile, and a name for a new customer', () => {
    expect(stepProblems('customer', draft(), false)).toEqual([])
    expect(stepProblems('customer', draft({ branchId: '', phone: '0501' }), true)).toEqual(['branch', 'phone', 'name'])
    expect(stepProblems('customer', draft({ customerName: 'سالم' }), true)).toEqual([])
  })

  it('checks the device step: a service, and a well-formed IMEI', () => {
    expect(stepProblems('device', draft({ serviceId: null }), false)).toEqual(['service'])
    expect(stepProblems('device', draft({ imei: '35-209900-176148-1' }), false)).toEqual([])
    expect(stepProblems('device', draft({ imei: '3520 9900' }), false)).toEqual(['imei'])
    expect(stepProblems('device', draft({ imei: '1'.repeat(21) }), false)).toEqual(['imei'])
  })

  it('checks estimates and asks for a payment method only when something is paid now', () => {
    expect(stepProblems('money', draft({ estimateType: 'Fixed' }), false)).toEqual(['estimateMin'])
    expect(stepProblems('money', draft({ estimateType: 'Range', estimateMin: '200', estimateMax: '100' }), false)).toEqual(['estimateMax'])
    expect(stepProblems('money', draft({ estimateType: 'Range', estimateMin: '100', estimateMax: '200' }), false)).toEqual([])
    expect(stepProblems('money', draft({ estimateType: 'AfterInspection' }), false)).toEqual([])
    expect(stepProblems('money', draft({ deposit: '50' }), false)).toEqual(['paymentMethod'])
    expect(stepProblems('money', draft({ inspectionFee: '30' }), false)).toEqual([])
    expect(stepProblems('money', draft({ inspectionFee: '30', inspectionFeePaidNow: true }), false)).toEqual(['paymentMethod'])
    expect(stepProblems('money', draft({ deposit: '-5' }), false)).toEqual(['amount'])
  })

  it('totals what is paid now', () => {
    expect(paidNow({ inspectionFee: '30', inspectionFeePaidNow: true, deposit: '50' })).toBe(80)
    expect(paidNow({ inspectionFee: '30', inspectionFeePaidNow: false, deposit: '' })).toBe(0)
  })

  it('builds the request: +966 phone, estimates by type, payment only when paying', () => {
    const body = intakeRequest(
      draft({ customerName: ' سالم ', estimateType: 'Fixed', estimateMin: '150', estimateMax: '999', deposit: '50', paymentMethod: 'Card', paymentReference: ' 77 ', accessories: ['Charger'], conditions: ['Scratches'] }),
    )
    expect(body.customerPhone).toBe('+966501234567')
    expect(body.customerName).toBe('سالم')
    expect(body.estimateMin).toBe(150)
    expect(body.estimateMax).toBeNull()
    expect(body.deposit).toBe(50)
    expect(body.inspectionFee).toBe(0)
    expect(body.paymentMethod).toBe('Card')
    expect(body.paymentReference).toBe('77')
    expect(body.device.name).toBeNull()
    const free = intakeRequest(draft({ paymentMethod: 'Cash', estimateType: 'AfterInspection', estimateMin: '10' }))
    expect(free.paymentMethod).toBeNull()
    expect(free.estimateMin).toBeNull()
    expect(free.inspectionFeePaidNow).toBe(false)
  })

  it('toggles flags in the form order and never offers None', () => {
    expect(toggleFlag(['Dents'], 'Scratches', CONDITIONS)).toEqual(['Scratches', 'Dents'])
    expect(toggleFlag(['Scratches', 'Dents'], 'Scratches', CONDITIONS)).toEqual(['Dents'])
    expect(CONDITIONS).not.toContain('None')
  })

  it('uploads photos in batches of ten', () => {
    expect(batches(Array.from({ length: 23 }, (_, i) => i)).map((b) => b.length)).toEqual([10, 10, 3])
    expect(batches([])).toEqual([])
  })
})

describe('the counter item (phase 2 §6–§10)', () => {
  it('counts missing intake photos', () => {
    expect(photosMissing({ photosCount: 0, isComplete: false })).toBe(2)
    expect(photosMissing({ photosCount: 1, isComplete: false })).toBe(1)
    expect(photosMissing({ photosCount: 2, isComplete: true })).toBe(0)
    expect(photosMissing(null)).toBe(0)
  })

  it('reads the available actions', () => {
    expect(can({ availableActions: ['AddPayment', 'Handover'] }, 'Handover')).toBe(true)
    expect(can({ availableActions: ['AddPayment'] }, 'Discount')).toBe(false)
  })

  it('reads the balance: owing, settled, or owed to the customer', () => {
    expect(balanceState(25)).toBe('due')
    expect(balanceState(0)).toBe('settled')
    expect(balanceState(0.001)).toBe('settled')
    expect(balanceState(-10)).toBe('credit')
  })

  it('allows a handover debt for the owner and supervisors only', () => {
    expect(canAllowDebt('owner')).toBe(true)
    expect(canAllowDebt('supervisor')).toBe(true)
    expect(canAllowDebt('frontDesk')).toBe(false)
  })

  it('keeps a discount within the caller limit and the bill', () => {
    const money = { amount: 400, maxDiscountPercent: 10 }
    expect(maxDiscountAmount(money)).toBe(40)
    expect(discountProblem({ mode: 'amount', value: '40', reason: 'عميل دائم' }, money)).toBeNull()
    expect(discountProblem({ mode: 'amount', value: '41', reason: 'عميل دائم' }, money)).toBe('overLimit')
    expect(discountProblem({ mode: 'amount', value: '500', reason: 'x' }, money)).toBe('overBill')
    expect(discountProblem({ mode: 'percent', value: '11', reason: 'x' }, money)).toBe('overLimit')
    expect(discountProblem({ mode: 'percent', value: '0', reason: 'إلغاء' }, money)).toBeNull()
    expect(discountProblem({ mode: 'percent', value: '5', reason: ' ' }, money)).toBe('reason')
    expect(discountProblem({ mode: 'amount', value: '', reason: 'x' }, money)).toBe('value')
    expect(maxDiscountAmount({ amount: 400, maxDiscountPercent: 0 })).toBe(0)
  })

  it('checks the 4-digit pickup code', () => {
    expect(isPickupCode('1234')).toBe(true)
    expect(isPickupCode('123')).toBe(false)
    expect(isPickupCode('12a4')).toBe(false)
  })
})

describe('wizard prefill (phase 5 §6: an out-of-warranty claim becomes a paid intake)', () => {
  it('fills the phone as local digits, the service and the device', () => {
    const d = draftFromPrefill({ phone: '+966501234567', canonicalServiceId: 'svc', device: { name: 'iPhone', brand: 'Apple', model: '13', imei: '3569', serialNumber: null } })
    expect(d.phone).toBe('501234567')
    expect(d.serviceId).toBe('svc')
    expect([d.deviceName, d.brand, d.model, d.imei, d.serialNumber]).toEqual(['iPhone', 'Apple', '13', '3569', ''])
  })

  it('ignores a missing or odd state', () => {
    expect(draftFromPrefill(undefined)).toEqual(EMPTY_INTAKE)
    expect(draftFromPrefill(null)).toEqual(EMPTY_INTAKE)
  })
})

describe('hold reasons (phase 5 §2)', () => {
  it('pause / resume: management only, a device at a branch, from the allowed statuses', () => {
    expect(holdActions({ status: 'Assessment', currentBranchId: 'b' }, 'owner')).toEqual({ canPause: true, canResume: false })
    expect(holdActions({ status: 'Assessment', currentBranchId: null }, 'owner').canPause).toBe(false)
    expect(holdActions({ status: 'Assessment', currentBranchId: 'b' }, 'frontDesk').canPause).toBe(false)
    expect(holdActions({ status: 'WaitingCustomerConfirmation', currentBranchId: 'b' }, 'supervisor').canPause).toBe(false)
    expect(holdActions({ status: 'Paused', currentBranchId: 'b' }, 'supervisor')).toEqual({ canPause: false, canResume: true })
  })

  it('needs the reason for a counter device; workshop fields go with ExternalWorkshop only', () => {
    expect(pauseProblems(EMPTY_PAUSE, true)).toEqual(['reason'])
    expect(pauseProblems(EMPTY_PAUSE, false)).toEqual([])
    expect(pauseProblems({ ...EMPTY_PAUSE, holdReason: 'ExternalWorkshop', externalCost: '-1' }, true)).toEqual(['cost'])
    const body = pauseRequest({ holdReason: 'WaitingParts', note: ' شاشة ', externalWorkshopName: 'X', externalCost: '50' })
    expect(body).toEqual({ holdReason: 'WaitingParts', note: 'شاشة', externalWorkshopName: null, externalCost: null })
    expect(pauseRequest({ holdReason: 'ExternalWorkshop', note: '', externalWorkshopName: ' ورشة ', externalCost: '50' })).toMatchObject({ externalWorkshopName: 'ورشة', externalCost: 50 })
  })
})

describe('storage and abandon (phase 5 §4)', () => {
  const storage = { readySince: '2026-10-01T00:00:00Z', daysWaiting: 20, abandonAfterDays: 90, remindersSent: 1, feePerDay: null, abandonedAt: null }
  it('days to abandon and the reason rule', () => {
    expect(daysToAbandon(storage)).toBe(70)
    expect(daysToAbandon({ ...storage, daysWaiting: 120 })).toBe(0)
    expect(daysToAbandon({ ...storage, readySince: null })).toBeNull()
    expect(abandonNeedsReason(storage)).toBe(true)
    expect(abandonNeedsReason({ remindersSent: 3 })).toBe(false)
  })
  it('shows the block once ready, abandoned or with a fee', () => {
    expect(showStorage(storage)).toBe(true)
    expect(showStorage({ readySince: null, abandonedAt: null, feePerDay: null })).toBe(false)
    expect(showStorage({ readySince: null, abandonedAt: null, feePerDay: 2 })).toBe(true)
  })
})

describe('WhatsApp (phase 4 §4)', () => {
  const on = { globalEnabled: true, branchAutoSend: true, senderAvailable: true, activeSender: 'Platform' as const, quotaUsed: 10, quotaAllowed: 100, quotaUnlimited: false, autoSendActive: true }
  it('says why messages go out or not, most blocking first', () => {
    expect(whatsAppNotice({ ...on, globalEnabled: false, branchAutoSend: false })).toBe('globalOff')
    expect(whatsAppNotice({ ...on, branchAutoSend: false })).toBe('branchOff')
    expect(whatsAppNotice({ ...on, senderAvailable: false, activeSender: null })).toBe('noSender')
    expect(whatsAppNotice({ ...on, quotaUsed: 100 })).toBe('quota')
    expect(whatsAppNotice({ ...on, quotaUsed: 100, quotaUnlimited: true })).toBe('platform')
    expect(whatsAppNotice({ ...on, activeSender: 'Provider' })).toBe('provider')
  })
  it('offers the kinds that apply now', () => {
    const base = { pendingQuotation: null, isReady: false, repairOutcome: null, handedOver: false }
    expect(resendKinds(base)).toEqual(['IntakeReceived'])
    expect(resendKinds({ ...base, pendingQuotation: {} as never })).toEqual(['IntakeReceived', 'QuoteReady'])
    expect(resendKinds({ ...base, isReady: true, repairOutcome: 'Repaired' })).toEqual(['IntakeReceived', 'ReadyForPickup'])
    expect(resendKinds({ ...base, isReady: true, repairOutcome: 'NotRepairable' })).toEqual(['IntakeReceived', 'NotRepairable'])
    expect(resendKinds({ ...base, isReady: true, repairOutcome: 'Repaired', handedOver: true })).toEqual(['IntakeReceived', 'Completed'])
  })
})

describe('branch board (phase 5 §3)', () => {
  it('opens walk-in rows at the counter and platform rows in work', () => {
    expect(boardItemHref({ serviceItemId: 'x', fulfillmentChannel: 'WalkIn' })).toBe('/counter/items/x')
    expect(boardItemHref({ serviceItemId: 'x', fulfillmentChannel: 'PickupDelivery' })).toBe('/work/x')
  })
  it('splits a stage bar by age relative to the longest bar', () => {
    expect(stageShares({ days0To2: 2, days3To7: 1, over7Days: 1 }, 8)).toEqual({ fresh: 25, mid: 12.5, old: 12.5 })
    expect(stageShares({ days0To2: 0, days3To7: 0, over7Days: 0 }, 0)).toEqual({ fresh: 0, mid: 0, old: 0 })
  })
})
