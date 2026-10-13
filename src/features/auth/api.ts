import { http } from '@/api/http'
import { deviceId } from '@/api/session'
import type { AuthResponse, CurrentUserResponse, OtpRequestResponse } from '@/api/types'

/** Phone + one-time code only — there are no passwords on the provider platform (§5.1). */
export const authApi = {
  requestOtp: (phoneNumber: string) => http.post<OtpRequestResponse>('/api/auth/request-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, code: string) =>
    http.post<AuthResponse>('/api/auth/verify-otp', { phoneNumber, code, deviceId: deviceId() }),
  me: (signal?: AbortSignal) => http.get<CurrentUserResponse>('/api/auth/me', undefined, signal),
  logout: () => http.post('/api/auth/logout'),
}
