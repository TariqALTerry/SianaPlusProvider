import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import type { QuotationResponse, QuotationReviewResponse } from '@/api/types'
import { TooltipProvider } from '@/components/ui/menu'
import { workApi } from '@/features/work/api'
import '@/i18n'
import { QuotationReviews } from './QuotationReviews'

const gate = vi.hoisted(() => ({ operational: true }))
vi.mock('@/app/provider', () => ({ useProvider: () => gate }))

const review = (over: Partial<QuotationReviewResponse> = {}): QuotationReviewResponse => ({
  serviceItemId: 'si1',
  itemNumber: 'SI-1',
  serviceNameAr: 'صيانة غسالة',
  serviceNameEn: 'Washer repair',
  executorName: 'فهد',
  executorLimit: 1000,
  quotation: { id: 'q1', quotationNumber: 'Q-1', total: 1200, increaseReason: 'قطعة أصلية', sentAt: null, createdAt: '2026-11-01T08:00:00Z' } as QuotationResponse,
  ...over,
})

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <QuotationReviews />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  gate.operational = true
})

describe('quotation reviews on Incoming', () => {
  it('shows nothing when no quotation waits', async () => {
    const list = vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([])
    const { container } = show()
    await waitFor(() => expect(list).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('lists the service, technician, total against the limit, and the reason', async () => {
    vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([review()])
    show()
    expect(await screen.findByText('صيانة غسالة')).toBeInTheDocument()
    expect(screen.getByText('فهد')).toBeInTheDocument()
    expect(screen.getByText('قطعة أصلية')).toBeInTheDocument()
    expect(screen.getByText('حد الفني')).toBeInTheDocument()
    expect(screen.getByText('أعلى من الحد بـ')).toBeInTheDocument()
  })

  it('does not claim an overrun when the technician has no limit any more', async () => {
    vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([review({ executorLimit: null })])
    show()
    expect(await screen.findByText('غير محدد')).toBeInTheDocument()
    expect(screen.queryByText('أعلى من الحد بـ')).not.toBeInTheDocument()
  })

  it('approves without a note', async () => {
    vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([review()])
    const approve = vi.spyOn(workApi, 'approveQuotationReview').mockResolvedValue('')
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'موافقة' }))
    fireEvent.click(await screen.findByRole('button', { name: 'موافقة', hidden: false }))
    await waitFor(() => expect(approve).toHaveBeenCalledWith('si1', 'q1', { note: null }))
  })

  it('requires a reason to reject, and keeps the server error in the dialog', async () => {
    vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([review()])
    const reject = vi.spyOn(workApi, 'rejectQuotationReview').mockRejectedValue(new ApiError({ status: 400, errorCode: 'QuotationNotPendingReview', message: 'هذا العرض لا ينتظر المراجعة.' }))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'رفض' }))
    const confirm = await screen.findByRole('button', { name: 'رفض', hidden: false })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/سبب الرفض/), { target: { value: '  السعر مرتفع  ' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() => expect(reject).toHaveBeenCalledWith('si1', 'q1', { note: 'السعر مرتفع' }))
    expect(await screen.findByText('هذا العرض لا ينتظر المراجعة.')).toBeInTheDocument()
  })

  it('disables the decisions when the company is not operational', async () => {
    gate.operational = false
    vi.spyOn(workApi, 'quotationReviews').mockResolvedValue([review()])
    show()
    expect(await screen.findByRole('button', { name: 'موافقة' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'رفض' })).toBeDisabled()
  })

  it('offers a retry when the list fails, rather than hiding it', async () => {
    vi.spyOn(workApi, 'quotationReviews').mockRejectedValue(new ApiError({ status: 500, errorCode: null, message: 'تعذّر' }))
    show()
    expect(await screen.findByText('تعذّر')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إعادة|retry/i })).toBeInTheDocument()
  })
})
