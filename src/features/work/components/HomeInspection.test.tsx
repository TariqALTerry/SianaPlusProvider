import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import type { HomeInspectionCheckResponse, HomeInspectionResponse, ServiceItemProviderView } from '@/api/types'
import '@/i18n'
import { workApi } from '../api'
import { useHomeInspection } from '../hooks'
import { HomeInspectionButton, HomeInspectionSheet, InspectionWarning } from './HomeInspection'
import { NetBlock } from './widgets'

const item = (over: Partial<ServiceItemProviderView> = {}) =>
  ({ id: 'si1', status: 'InProgress', isSubscriptionCovered: true, itemNumber: 'SI-1', serviceNameAr: 'فحص البيت', serviceNameEn: 'Home check', ...over }) as ServiceItemProviderView

const check = (key: string, result: HomeInspectionCheckResponse['result'], over: Partial<HomeInspectionCheckResponse> = {}): HomeInspectionCheckResponse => ({
  key,
  areaKey: 'kitchen',
  labelAr: `بند ${key}`,
  labelEn: `Check ${key}`,
  result,
  note: null,
  recommendedServiceId: null,
  recommendedServiceNameAr: null,
  recommendedServiceNameEn: null,
  ...over,
})

const report = (over: Partial<HomeInspectionResponse> = {}): HomeInspectionResponse => ({
  id: null,
  serviceItemId: 'si1',
  orderId: 'o1',
  orderNumber: null,
  itemNumber: 'SI-1',
  serviceNameAr: 'فحص البيت',
  serviceNameEn: 'Home check',
  subscriptionId: null,
  addressLabel: null,
  district: null,
  inspectorName: 'فهد',
  status: null,
  score: null,
  goodCount: 0,
  needsAttentionCount: 0,
  urgentCount: 0,
  summary: null,
  submittedAt: null,
  updatedAt: null,
  canEdit: false,
  areas: [{ key: 'kitchen', nameAr: 'المطبخ', nameEn: 'Kitchen' }],
  checks: [check('a', null), check('b', null), check('c', null)],
  ...over,
})

function Harness({ target }: { target: ServiceItemProviderView }) {
  const query = useHomeInspection(target, false)
  const [open, setOpen] = useState(true)
  return (
    <>
      <HomeInspectionButton query={query} onOpen={() => setOpen(true)} />
      <InspectionWarning item={target} query={query} onOpen={() => setOpen(true)} />
      <HomeInspectionSheet query={query} open={open} onOpenChange={setOpen} />
    </>
  )
}

function renderHarness(target: ServiceItemProviderView) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Harness target={target} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

const REQUIRED = 'يجب أن يرسل الفني تقرير صحة البيت قبل الإنهاء.'

describe('«صحة بيتك» on the work item (HOME-SUBSCRIPTIONS PHASE2 §2–§3)', () => {
  it('never asks for an item that is not covered', () => {
    const spy = vi.spyOn(workApi, 'homeInspection')
    renderHarness(item({ isSubscriptionCovered: false }))
    expect(spy).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /تقرير صحة بيتك/, hidden: true })).not.toBeInTheDocument()
  })

  it('hides the button when the covered visit is not a health check', async () => {
    const spy = vi.spyOn(workApi, 'homeInspection').mockRejectedValue(new ApiError({ status: 400, errorCode: 'HomeInspectionNotRequired', message: 'ليست زيارة فحص' }))
    renderHarness(item())
    await vi.waitFor(() => expect(spy).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('button', { name: /تقرير صحة بيتك/, hidden: true })).not.toBeInTheDocument()
    expect(screen.queryByText(REQUIRED)).not.toBeInTheDocument()
  })

  it('not started: says so, and warns while the job is running', async () => {
    vi.spyOn(workApi, 'homeInspection').mockResolvedValue(report())
    renderHarness(item())
    expect(await screen.findByText('لم يبدأ الفني الفحص بعد')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تقرير صحة بيتك/, hidden: true })).toBeInTheDocument()
    expect(screen.getByText(REQUIRED)).toBeInTheDocument()
  })

  it('draft: shows the progress of answered checks', async () => {
    vi.spyOn(workApi, 'homeInspection').mockResolvedValue(report({ id: 'r1', status: 'Draft', checks: [check('a', 'Good'), check('b', 'Urgent'), check('c', null)] }))
    renderHarness(item({ status: 'Arrived' }))
    expect(await screen.findByText('أُنجز 2 من 3')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByText(REQUIRED)).toBeInTheDocument()
  })

  it('submitted: the full report with the suggestions, and no warning', async () => {
    vi.spyOn(workApi, 'homeInspection').mockResolvedValue(
      report({
        id: 'r1',
        status: 'Submitted',
        score: 50,
        goodCount: 1,
        needsAttentionCount: 0,
        urgentCount: 1,
        summary: 'تسريب تحت المغسلة',
        submittedAt: '2026-10-29T08:00:00Z',
        checks: [
          check('a', 'Good'),
          check('b', 'Urgent', { note: 'تسريب واضح', recommendedServiceId: 's1', recommendedServiceNameAr: 'سباكة', recommendedServiceNameEn: 'Plumbing' }),
          check('c', 'NotApplicable'),
        ],
      }),
    )
    renderHarness(item())
    expect(await screen.findByText('مقترحات للعميل')).toBeInTheDocument()
    expect(screen.getByText('الخدمة المقترحة: سباكة')).toBeInTheDocument()
    expect(screen.getByText('تسريب واضح')).toBeInTheDocument()
    expect(screen.getByText('تسريب تحت المغسلة')).toBeInTheDocument()
    expect(screen.getByText('المطبخ')).toBeInTheDocument()
    expect(screen.queryByText(REQUIRED)).not.toBeInTheDocument()
  })
})

describe('money block of a covered item (HOME-SUBSCRIPTIONS-PROVIDER-PLATFORM-PROMPT §2)', () => {
  const money = { netAmount: 170, finalAmount: 200, commissionRate: 0.15, baseAmount: 200, quotedAmount: null, refundedAmount: 0 }

  it('shows what the technician collects and the cash note', () => {
    render(<NetBlock item={{ ...money, coveredAmount: 150, customerPays: 50, isSubscriptionCovered: true }} />)
    expect(screen.getByText('يغطيه اشتراك العميل')).toBeInTheDocument()
    expect(screen.getByText('يحصّله الفني من العميل')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('إن كان الدفع نقدًا')
  })

  it('covered with nothing paid by the subscription: no covered line, still the customer share', () => {
    render(<NetBlock item={{ ...money, coveredAmount: 0, customerPays: 200, isSubscriptionCovered: true }} />)
    expect(screen.queryByText('يغطيه اشتراك العميل')).not.toBeInTheDocument()
    expect(screen.getByText('يحصّله الفني من العميل')).toBeInTheDocument()
  })

  it('leaves uncovered items as they were', () => {
    render(<NetBlock item={{ ...money, coveredAmount: 0, customerPays: 200, isSubscriptionCovered: false }} />)
    expect(screen.queryByText('يحصّله الفني من العميل')).not.toBeInTheDocument()
  })
})
