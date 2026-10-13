import { http } from '@/api/http'
import { deviceId } from '@/api/session'
import type { OtpRequestResponse, ProviderRegistrationRequest, ProviderRegistrationResponse } from '@/api/types'

/** Public self-registration (§5.2). The code is verified together with the registration. */
export const joinApi = {
  requestOtp: (phoneNumber: string) => http.post<OtpRequestResponse>('/api/provider/registration/request-otp', { phoneNumber }),
  register: (body: Omit<ProviderRegistrationRequest, 'deviceId'>) =>
    http.post<ProviderRegistrationResponse>('/api/provider/registration', { ...body, deviceId: deviceId() }),
}
