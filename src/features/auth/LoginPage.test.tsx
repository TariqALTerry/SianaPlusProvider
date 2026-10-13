import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import '@/i18n'
import { authApi } from './api'
import { LoginPage } from './LoginPage'

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('sign-in: phone linked to several accounts (§5.1)', () => {
  it('replaces the form with a contact-support state, and "another number" goes back', async () => {
    vi.spyOn(authApi, 'requestOtp').mockRejectedValue(
      new ApiError({ status: 400, errorCode: 'PhoneLinkedToMultipleAccounts', message: 'server message' }),
    )
    renderLogin()

    fireEvent.change(screen.getByLabelText('رقم الجوال'), { target: { value: '0501234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرمز' }))

    expect(await screen.findByText('هذا الرقم مرتبط بأكثر من حساب')).toBeInTheDocument()
    expect(screen.getByText('تواصل مع الدعم')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إرسال الرمز' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'استخدم رقمًا آخر' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'إرسال الرمز' })).toBeInTheDocument())
    expect(screen.getByLabelText('رقم الجوال')).toHaveValue('')
  })
})
