import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import type { CashHoldingsResponse, CashItem, ProviderWorkBoardResponse } from '@/api/types'
import { TooltipProvider } from '@/components/ui/menu'
import { workApi } from '@/features/work/api'
import '@/i18n'
import { formatMoney } from '@/lib/format'
import { insightsApi } from './api'
import { CashPage } from './CashPage'

const item = (id: string, amount: number, collectedAt: string): CashItem => ({
  serviceItemId: id,
  parentOrderId: 'o',
  itemNumber: `SI-${id}`,
  serviceNameAr: 'صيانة غسالة',
  serviceNameEn: 'Washer repair',
  status: 'Completed',
  amount,
  collectedAt,
  handedOverAt: null,
  handedOverBy: null,
})

const holdings: CashHoldingsResponse = {
  totalHeld: 150.35,
  items: 2,
  handedOverLast30Days: 0,
  technicians: [
    { executorId: 'e1', fullName: 'سالم العتيبي', providerOrganizationId: 'p', providerName: 'منشأة', heldAmount: 150.35, items: 2, oldestCollectedAt: '2026-10-25T09:00:00Z', daysHeld: 10 },
  ],
}

function renderCash() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/team/cash?executorId=e1']}>
          <Routes>
            <Route path="/team/cash" element={<CashPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(workApi, 'board').mockResolvedValue({ executors: [] } as unknown as ProviderWorkBoardResponse)
  vi.spyOn(insightsApi, 'cash').mockResolvedValue(holdings)
})
afterEach(() => vi.restoreAllMocks())

const ar = (n: number) => formatMoney(n, 'ar')

describe('cash with technicians: recording a handover', () => {
  it('totals the selection and states exactly what will be recorded', async () => {
    const items = vi.spyOn(insightsApi, 'cashItems').mockResolvedValue([item('a', 100.1, '2026-10-25T09:00:00Z'), item('b', 50.25, '2026-11-03T09:00:00Z')])
    const handover = vi.spyOn(insightsApi, 'cashHandover').mockResolvedValue({ items: 2, amount: 150.35 })
    renderCash()

    fireEvent.click(await screen.findByRole('checkbox', { name: 'تحديد الكل' }))
    const receive = screen.getByRole('button', { name: /استلمت المبلغ من الفني/ })
    expect(receive).toBeEnabled()
    expect(screen.getAllByText(ar(150.35)).length).toBeGreaterThan(0)

    fireEvent.click(receive)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('سالم العتيبي · خدمتان')).toBeInTheDocument()
    expect(within(dialog).getByText(/لا يغيّر أي تسوية/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: `تسجيل استلام ${ar(150.35)}` }))
    await waitFor(() => expect(handover).toHaveBeenCalledWith({ serviceItemIds: ['a', 'b'], note: undefined }))
    // The holdings and the items are read again.
    await waitFor(() => expect(items.mock.calls.length).toBeGreaterThan(1))
  })

  it('refreshes and explains when some items are no longer held', async () => {
    const items = vi
      .spyOn(insightsApi, 'cashItems')
      .mockResolvedValueOnce([item('a', 100.1, '2026-10-25T09:00:00Z'), item('b', 50.25, '2026-11-03T09:00:00Z')])
      .mockResolvedValue([item('b', 50.25, '2026-11-03T09:00:00Z')])
    vi.spyOn(insightsApi, 'cashHandover').mockRejectedValue(new ApiError({ status: 400, errorCode: 'CashHandoverInvalid', message: 'رسالة الخادم' }))
    renderCash()

    fireEvent.click(await screen.findByRole('checkbox', { name: 'تحديد الكل' }))
    fireEvent.click(screen.getByRole('button', { name: /استلمت المبلغ من الفني/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: `تسجيل استلام ${ar(150.35)}` }))

    expect(await within(dialog).findByText('رسالة الخادم')).toBeInTheDocument()
    expect(within(dialog).getByText(/حدّثنا القائمة والمبلغ/)).toBeInTheDocument()
    await waitFor(() => expect(items).toHaveBeenCalledTimes(2))
    // The handed-over item drops out: the dialog now states the one still held.
    await waitFor(() => expect(within(dialog).getByText('سالم العتيبي · خدمة واحدة')).toBeInTheDocument())
    expect(within(dialog).getByRole('button', { name: `تسجيل استلام ${ar(50.25)}` })).toBeEnabled()
  })

  it('blocks more than 200 services at once', async () => {
    vi.spyOn(insightsApi, 'cashItems').mockResolvedValue(Array.from({ length: 201 }, (_, i) => item(`i${i}`, 10, '2026-11-03T09:00:00Z')))
    renderCash()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'تحديد الكل' }))
    expect(screen.getByText(/200 خدمة كحد أقصى/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /استلمت المبلغ من الفني/ })).toBeDisabled()
  })
})
