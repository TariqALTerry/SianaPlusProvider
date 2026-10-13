import { http } from '@/api/http'
import { qk } from '@/api/keys'
import type {
  CoverageAreaRequest,
  CoverageAreaResponse,
  ProviderBusinessModel,
  ProviderCapabilitiesResponse,
  ProviderDocumentResponse,
  ProviderDocumentType,
  ProviderOrganizationResponse,
  PublicCapabilityResponse,
  UpdateProviderOperationsRequest,
  UpdateProviderProfileRequest,
} from '@/api/types'

const BASE = '/api/provider/organization'

/**
 * Sub-resources live under `qk.organization`, so the "invalidate qk.organization after every
 * organization write" rule also refreshes the documents, capabilities and coverage lists.
 */
export const organizationKeys = {
  documents: [...qk.organization, 'documents'] as const,
  capabilities: [...qk.organization, 'capabilities'] as const,
  coverage: [...qk.organization, 'coverage'] as const,
}

export const catalogKeys = {
  capabilities: [...qk.catalog, 'capabilities'] as const,
}

export interface UploadDocumentInput {
  file: File
  type: ProviderDocumentType
  documentNumber?: string | null
  /** ISO UTC. */
  expiresAt?: string | null
}

/**
 * Multipart body for `POST …/documents`: `file` plus the `[FromForm] UploadProviderDocumentRequest`
 * fields (ASP.NET binds form keys case-insensitively). Empty optionals are left out.
 */
export function documentFormData(input: UploadDocumentInput): FormData {
  const form = new FormData()
  form.append('file', input.file)
  form.append('type', input.type)
  const number = input.documentNumber?.trim()
  if (number) form.append('documentNumber', number)
  if (input.expiresAt) form.append('expiresAt', input.expiresAt)
  return form
}

export const organizationApi = {
  // Profile (owner only) and logo (both roles).
  updateProfile: (body: UpdateProviderProfileRequest) => http.put<ProviderOrganizationResponse>(BASE, body),
  uploadLogo: (file: File) => http.upload<string>(`${BASE}/logo`, file),

  // Documents.
  documents: (signal?: AbortSignal) => http.get<ProviderDocumentResponse[]>(`${BASE}/documents`, undefined, signal),
  uploadDocument: (input: UploadDocumentInput) => http.post<ProviderDocumentResponse>(`${BASE}/documents`, documentFormData(input)),
  deleteDocument: (id: string) => http.delete(`${BASE}/documents/${id}`),

  // Capabilities.
  capabilities: (signal?: AbortSignal) => http.get<ProviderCapabilitiesResponse>(`${BASE}/capabilities`, undefined, signal),
  updateCapabilities: (capabilityIds: string[]) => http.put<ProviderCapabilitiesResponse>(`${BASE}/capabilities`, { capabilityIds }),
  catalogCapabilities: (signal?: AbortSignal) => http.get<PublicCapabilityResponse[]>('/api/catalog/capabilities', undefined, signal),

  // Coverage.
  coverage: (signal?: AbortSignal) => http.get<CoverageAreaResponse[]>(`${BASE}/coverage`, undefined, signal),
  addCoverage: (body: CoverageAreaRequest) => http.post<CoverageAreaResponse>(`${BASE}/coverage`, body),
  updateCoverage: (id: string, body: CoverageAreaRequest) => http.put<CoverageAreaResponse>(`${BASE}/coverage/${id}`, body),
  deleteCoverage: (id: string) => http.delete(`${BASE}/coverage/${id}`),

  // Operations (both roles) and business model (owner, Draft/Rejected).
  updateOperations: (body: UpdateProviderOperationsRequest) => http.put<ProviderOrganizationResponse>(`${BASE}/operations`, body),
  updateBusinessModel: (businessModel: ProviderBusinessModel) =>
    http.put<ProviderOrganizationResponse>(`${BASE}/business-model`, { businessModel }),
}
