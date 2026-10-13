// AUTO-GENERATED from Siana.Core/DTOs and Siana.Core/Enums. Regenerate with
// `npm run gen:types` — do not edit by hand.
/* eslint-disable */

export const ExecutionModeValues = ['Appliance', 'DirectRepair', 'ScheduledService', 'ProjectService', 'Delivery', 'Workshop'] as const
export type ExecutionMode = (typeof ExecutionModeValues)[number]
export const PricingTypeValues = ['Fixed', 'InspectionThenQuote', 'QuoteRequired'] as const
export type PricingType = (typeof PricingTypeValues)[number]
export const DynamicFieldTypeValues = ['Text', 'Number', 'Select', 'MultiSelect', 'Boolean', 'Date', 'Image'] as const
export type DynamicFieldType = (typeof DynamicFieldTypeValues)[number]
export const PriceItemTypeValues = ['Labor', 'Part', 'AddOn', 'Inspection', 'Discount'] as const
export type PriceItemType = (typeof PriceItemTypeValues)[number]
export const ActiveFilterValues = ['Active', 'Inactive', 'All'] as const
export type ActiveFilter = (typeof ActiveFilterValues)[number]
export const AuditActionValues = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'PasswordChange', 'StatusChange', 'Assign', 'Approve', 'Reject', 'Refund', 'Settle', 'Cancel'] as const
export type AuditAction = (typeof AuditActionValues)[number]
export const NotificationTypeValues = ['Info', 'Success', 'Warning', 'Alert'] as const
export type NotificationType = (typeof NotificationTypeValues)[number]
export const FileCategoryValues = ['Avatar', 'Attachment', 'Document', 'Import', 'Export', 'Evidence', 'ProviderDocument', 'CatalogMedia', 'ProductImage'] as const
export type FileCategory = (typeof FileCategoryValues)[number]
export const ActorTypeValues = ['System', 'Customer', 'Admin', 'Provider', 'Executor'] as const
export type ActorType = (typeof ActorTypeValues)[number]
export const QuotationStatusValues = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired', 'Cancelled'] as const
export type QuotationStatus = (typeof QuotationStatusValues)[number]
export const EvidenceStageValues = ['CustomerRequest', 'Before', 'During', 'After', 'Custody', 'Handover'] as const
export type EvidenceStage = (typeof EvidenceStageValues)[number]
export const EvidenceTypeValues = ['Image', 'Video', 'Document'] as const
export type EvidenceType = (typeof EvidenceTypeValues)[number]
export const ExecutionStepValues = ['Inspection', 'Diagnosis', 'Quotation', 'CustomerApproval', 'Repair', 'Testing', 'Documentation', 'Completion', 'Assessment', 'IdentifyIssue', 'Execution', 'ScopeReview', 'PreService', 'CustomerConfirmation', 'Survey', 'Measurements', 'Scheduling', 'Progress', 'Handover', 'Pickup', 'CustodyDocumentation', 'Transport', 'Delivery', 'Verification', 'DeviceIntake', 'Return'] as const
export type ExecutionStep = (typeof ExecutionStepValues)[number]
export const PaymentMethodValues = ['Cash', 'Card', 'Wallet', 'BankTransfer', 'ApplePay'] as const
export type PaymentMethod = (typeof PaymentMethodValues)[number]
export const PaymentStatusValues = ['Pending', 'Authorized', 'Paid', 'Failed', 'Refunded', 'PartiallyRefunded'] as const
export type PaymentStatus = (typeof PaymentStatusValues)[number]
export const RefundStatusValues = ['Requested', 'Approved', 'Rejected', 'Processed'] as const
export type RefundStatus = (typeof RefundStatusValues)[number]
export const SettlementPartyTypeValues = ['Provider', 'Executor'] as const
export type SettlementPartyType = (typeof SettlementPartyTypeValues)[number]
export const SettlementStatusValues = ['Pending', 'Approved', 'Paid', 'OnHold'] as const
export type SettlementStatus = (typeof SettlementStatusValues)[number]
export const WarrantyStatusValues = ['Active', 'Expired', 'Claimed', 'Void'] as const
export type WarrantyStatus = (typeof WarrantyStatusValues)[number]
export const MarketplaceRequestStatusValues = ['Open', 'Awarded', 'Closed', 'Cancelled'] as const
export type MarketplaceRequestStatus = (typeof MarketplaceRequestStatusValues)[number]
export const MarketplaceOfferStatusValues = ['Submitted', 'Accepted', 'Rejected', 'Withdrawn'] as const
export type MarketplaceOfferStatus = (typeof MarketplaceOfferStatusValues)[number]
export const ParentOrderStatusValues = ['Draft', 'PendingPayment', 'InProgress', 'Completed', 'Cancelled'] as const
export type ParentOrderStatus = (typeof ParentOrderStatusValues)[number]
export const ServiceItemStatusValues = ['Created', 'PendingAssignment', 'AssignedToProvider', 'AssignedToExecutor', 'Accepted', 'Scheduled', 'EnRoute', 'Arrived', 'Assessment', 'WaitingCustomerApproval', 'InProgress', 'WaitingCustomerConfirmation', 'Completed', 'Cancelled', 'Rejected', 'Paused', 'Disputed', 'Refunded', 'PartiallyRefunded'] as const
export type ServiceItemStatus = (typeof ServiceItemStatusValues)[number]
export const CancellationInitiatorValues = ['Customer', 'Admin', 'Provider', 'Executor', 'System'] as const
export type CancellationInitiator = (typeof CancellationInitiatorValues)[number]
export const AssignmentTypeValues = ['ProviderAssignment', 'ExecutorAssignment'] as const
export type AssignmentType = (typeof AssignmentTypeValues)[number]
export const AssignmentStatusValues = ['Pending', 'Accepted', 'Rejected', 'Reassigned', 'Cancelled'] as const
export type AssignmentStatus = (typeof AssignmentStatusValues)[number]
export const OrderSourceValues = ['CustomerApp', 'SmartRequest', 'Admin', 'Store'] as const
export type OrderSource = (typeof OrderSourceValues)[number]
export const OtpPurposeValues = ['CustomerLogin', 'ProviderLogin', 'ProviderRegistration'] as const
export type OtpPurpose = (typeof OtpPurposeValues)[number]
export const ProviderTypeValues = ['IndependentTechnician', 'Company'] as const
export type ProviderType = (typeof ProviderTypeValues)[number]
export const ProviderVerificationStatusValues = ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Trial', 'Rejected', 'Suspended'] as const
export type ProviderVerificationStatus = (typeof ProviderVerificationStatusValues)[number]
export const ProviderBusinessModelValues = ['ExecutionPartner', 'MarketplacePartner', 'Both'] as const
export type ProviderBusinessModel = (typeof ProviderBusinessModelValues)[number]
export const ProviderMemberRoleValues = ['Owner', 'Supervisor', 'Executor'] as const
export type ProviderMemberRole = (typeof ProviderMemberRoleValues)[number]
export const ProviderDocumentTypeValues = ['CommercialRegistration', 'NationalId', 'ProfessionalLicense', 'Insurance', 'TaxCertificate', 'Other'] as const
export type ProviderDocumentType = (typeof ProviderDocumentTypeValues)[number]
export const ProviderDocumentStatusValues = ['Pending', 'Approved', 'Rejected', 'Expired'] as const
export type ProviderDocumentStatus = (typeof ProviderDocumentStatusValues)[number]
export const CoverageShapeValues = ['CityDistrict', 'Circle', 'Polygon'] as const
export type CoverageShape = (typeof CoverageShapeValues)[number]
export const ExecutorAvailabilityValues = ['Available', 'Busy', 'Offline', 'OnLeave'] as const
export type ExecutorAvailability = (typeof ExecutorAvailabilityValues)[number]
export const DisputeStatusValues = ['Open', 'UnderReview', 'Resolved', 'Rejected', 'Escalated'] as const
export type DisputeStatus = (typeof DisputeStatusValues)[number]
export const DisputeResolutionTypeValues = ['None', 'FullRefund', 'PartialRefund', 'Rework', 'NoAction'] as const
export type DisputeResolutionType = (typeof DisputeResolutionTypeValues)[number]
export const RoleValues = ['SuperAdmin', 'TenantAdmin', 'Manager', 'Member', 'PlatformAdmin', 'Customer', 'ProviderOwner', 'ProviderSupervisor', 'Executor'] as const
export type Role = (typeof RoleValues)[number]
export const StoreOrderStatusValues = ['Draft', 'PendingPayment', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const
export type StoreOrderStatus = (typeof StoreOrderStatusValues)[number]
export const UserStatusValues = ['PendingApproval', 'Active', 'Suspended'] as const
export type UserStatus = (typeof UserStatusValues)[number]

// ── Assignments/AssignmentDtos.cs
export interface AssignProviderRequest {
  providerOrganizationId: string
  reason?: string | null
  autoAssignExecutor: boolean
}
export interface AssignExecutorRequest {
  executorId: string
  reason?: string | null
}
export interface UnassignRequest {
  reason?: string | null
}
export interface ProviderCandidateResponse {
  providerOrganizationId: string
  displayName: string
  type: ProviderType
  verificationStatus: ProviderVerificationStatus
  businessModel: ProviderBusinessModel
  hasAllCapabilities: boolean
  coversAddress: boolean
  capacity: number
  activeItems: number
  availableExecutors: number
  averageRating: number
  completedItemsCount: number
  delegatesExecutorAssignment: boolean
  isDemo: boolean
  distanceKm: number | null
  matchedAreaName: string | null
  isEligible: boolean
  score: number
  hasCapacity: boolean
}
export interface ExecutorCandidateResponse {
  executorId: string
  userId: string
  fullName: string
  phoneNumber: string | null
  specialization: string | null
  availability: ExecutorAvailability
  hasAllCapabilities: boolean
  maxConcurrentJobs: number
  activeJobs: number
  averageRating: number
  completedItemsCount: number
  distanceKm: number | null
  isEligible: boolean
  score: number
  hasCapacity: boolean
}
export interface AssignmentResponse {
  id: string
  type: AssignmentType
  status: AssignmentStatus
  providerOrganizationId: string
  providerName: string
  executorId: string | null
  executorName: string | null
  assignedByType: ActorType
  reason: string | null
  respondedAt: string | null
  responseNote: string | null
  createdAt: string
}

// ── Auth/AuthRequests.cs
export interface LoginRequest {
  username: string
  password: string
  deviceId?: string | null
}
export interface RequestOtpRequest {
  phoneNumber: string
}
export interface VerifyOtpRequest {
  phoneNumber: string
  code: string
  deviceId?: string | null
}
export interface RefreshTokenRequest {
  accessToken: string
  refreshToken: string
  deviceId?: string | null
}
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ── Auth/AuthResponses.cs
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  isNewUser: boolean
  user: CurrentUserResponse
}
export interface CurrentUserResponse {
  id: string
  username: string
  fullName: string
  email: string | null
  phoneNumber: string | null
  role: Role
  status: UserStatus
  tenantId: string | null
  tenantName: string | null
  lastLoginAt: string | null
  isProfileComplete: boolean
  permissions: string[]
  staffRoleNameAr: string | null
  staffRoleNameEn: string | null
}
export interface OtpRequestResponse {
  phoneNumber: string
  codeLength: number
  expiresAt: string
  resendAvailableAt: string
}

// ── Catalog/CatalogAdminDtos.cs
export interface SetActiveRequest {
  isActive: boolean
}
export interface ReorderRequest {
  ids: string[]
}
export interface CategoryListRequest extends PaginatedRequest {
  status?: ActiveFilter
  search?: string | null
}
export interface CreateCategoryRequest {
  code: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  sortOrder: number
}
export interface UpdateCategoryRequest {
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  sortOrder: number
}
export interface SubcategoryListRequest extends PaginatedRequest {
  status?: ActiveFilter
  search?: string | null
}
export interface CreateSubcategoryRequest {
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
}
export interface UpdateSubcategoryRequest {
  nameAr: string
  nameEn: string
  sortOrder: number
}
export interface ServiceListRequest extends PaginatedRequest {
  categoryId?: string | null
  subcategoryId?: string | null
  executionMode?: ExecutionMode | null
  pricingType?: PricingType | null
  status?: ActiveFilter
  search?: string | null
}
export interface CreateServiceRequest {
  subcategoryId: string
  code: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  keywords?: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  basePrice?: number | null
  requiresDevice: boolean
  supportsMultiDevice: boolean
  requiresBeforeEvidence: boolean
  requiresAfterEvidence: boolean
  requiresCustomerConfirmation: boolean
  warrantyDays?: number | null
  estimatedDurationMinutes?: number | null
  commissionRate?: number | null
  sortOrder: number
  isInternal: boolean
}
export interface UpdateServiceRequest {
  subcategoryId: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  keywords?: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  basePrice?: number | null
  requiresDevice: boolean
  supportsMultiDevice: boolean
  requiresBeforeEvidence: boolean
  requiresAfterEvidence: boolean
  requiresCustomerConfirmation: boolean
  warrantyDays?: number | null
  estimatedDurationMinutes?: number | null
  commissionRate?: number | null
  sortOrder: number
  isInternal: boolean
}
export interface SetServiceCapabilitiesRequest {
  capabilityIds: string[]
}
export interface CreateServiceIssueRequest {
  code: string
  nameAr: string
  nameEn: string
  keywords?: string | null
  sortOrder: number
}
export interface UpdateServiceIssueRequest {
  nameAr: string
  nameEn: string
  keywords?: string | null
  sortOrder: number
}
export interface CreateDynamicFieldRequest {
  key: string
  labelAr: string
  labelEn: string
  fieldType: DynamicFieldType
  isRequired: boolean
  optionsJson?: string | null
  sortOrder: number
}
export interface UpdateDynamicFieldRequest {
  labelAr: string
  labelEn: string
  fieldType: DynamicFieldType
  isRequired: boolean
  optionsJson?: string | null
  sortOrder: number
  isActive: boolean
}
export interface CapabilityListRequest extends PaginatedRequest {
  status?: ActiveFilter
  search?: string | null
}
export interface CreateCapabilityRequest {
  code: string
  nameAr: string
  nameEn: string
}
export interface UpdateCapabilityRequest {
  nameAr: string
  nameEn: string
}
export interface PriceItemListRequest extends PaginatedRequest {
  serviceId?: string | null
  globalOnly?: boolean | null
  itemType?: PriceItemType | null
  status?: ActiveFilter
  search?: string | null
}
export interface CreatePriceItemRequest {
  canonicalServiceId?: string | null
  code: string
  nameAr: string
  nameEn: string
  itemType: PriceItemType
  unitPrice: number
  maxUnitPrice?: number | null
}
export interface UpdatePriceItemRequest {
  nameAr: string
  nameEn: string
  itemType: PriceItemType
  unitPrice: number
  maxUnitPrice?: number | null
}
export interface CategoryAdminResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  iconUrl: string | null
  sortOrder: number
  isActive: boolean
  subcategoryCount: number
  createdAt: string
}
export interface SubcategoryAdminResponse {
  id: string
  categoryId: string
  code: string
  nameAr: string
  nameEn: string
  iconUrl: string | null
  sortOrder: number
  isActive: boolean
  serviceCount: number
  createdAt: string
}
export interface ServiceAdminListItemResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  subcategoryId: string
  subcategoryNameAr: string
  subcategoryNameEn: string
  categoryId: string
  categoryNameAr: string
  categoryNameEn: string
  imageUrl: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  basePrice: number | null
  requiresDevice: boolean
  supportsMultiDevice: boolean
  sortOrder: number
  isActive: boolean
  isInternal: boolean
  createdAt: string
  updatedAt: string | null
}
export interface ServiceAdminDetailResponse extends ServiceAdminListItemResponse {
  descriptionAr: string | null
  descriptionEn: string | null
  keywords: string | null
  requiresBeforeEvidence: boolean
  requiresAfterEvidence: boolean
  requiresCustomerConfirmation: boolean
  warrantyDays: number | null
  estimatedDurationMinutes: number | null
  commissionRate: number | null
  issues: ServiceIssueResponse[]
  dynamicFields: DynamicFieldAdminResponse[]
  requiredCapabilities: LookupResponse[]
  priceItems: PriceItemResponse[]
}
export interface ServiceIssueResponse {
  id: string
  canonicalServiceId: string
  code: string
  nameAr: string
  nameEn: string
  keywords: string | null
  sortOrder: number
  isActive: boolean
}
export interface DynamicFieldAdminResponse {
  id: string
  canonicalServiceId: string
  key: string
  labelAr: string
  labelEn: string
  fieldType: DynamicFieldType
  isRequired: boolean
  optionsJson: string | null
  options: string[]
  sortOrder: number
  isActive: boolean
}
export interface CapabilityResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  isActive: boolean
  createdAt: string
}
export interface PriceItemResponse {
  id: string
  canonicalServiceId: string | null
  code: string
  nameAr: string
  nameEn: string
  itemType: PriceItemType
  unitPrice: number
  maxUnitPrice: number | null
  isActive: boolean
  createdAt: string
}

// ── Catalog/CatalogDtos.cs
export interface ServiceSearchRequest {
  q: string
}
export interface CategoryResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  iconUrl: string | null
  sortOrder: number
  subcategories: SubcategoryResponse[]
}
export interface SubcategoryResponse {
  id: string
  categoryId: string
  code: string
  nameAr: string
  nameEn: string
  iconUrl: string | null
  sortOrder: number
  serviceCount: number
}
export interface ServiceCardResponse {
  id: string
  code: string
  subcategoryId: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  imageUrl: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  basePrice: number | null
  requiresDevice: boolean
  supportsMultiDevice: boolean
  estimatedDurationMinutes: number | null
  warrantyDays: number | null
  sortOrder: number
}
export interface DynamicFieldResponse {
  id: string
  key: string
  labelAr: string
  labelEn: string
  fieldType: DynamicFieldType
  isRequired: boolean
  options: string[]
  sortOrder: number
}
export interface ServiceDetailResponse extends ServiceCardResponse {
  categoryId: string
  categoryNameAr: string
  categoryNameEn: string
  subcategoryNameAr: string
  subcategoryNameEn: string
  requiresCustomerConfirmation: boolean
  issues: LookupResponse[]
  dynamicFields: DynamicFieldResponse[]
}
export interface CatalogTreeResponse {
  categories: CatalogTreeCategoryResponse[]
}
export interface CatalogTreeCategoryResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  iconUrl: string | null
  sortOrder: number
  subcategories: CatalogTreeSubcategoryResponse[]
}
export interface CatalogTreeSubcategoryResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  iconUrl: string | null
  sortOrder: number
  services: ServiceCardResponse[]
}
export interface PublicCapabilityResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  categoryCodes: string[]
  servicesCount: number
}

// ── Catalog/SmartRequestDtos.cs
export interface SmartRequestAnalyzeRequest {
  text: string
}
export interface SmartRequestHistoryRequest extends PaginatedRequest {
}
export interface SmartRequestMatch {
  canonicalServiceId: string
  serviceCode: string
  serviceNameAr: string
  serviceNameEn: string
  categoryId: string
  categoryNameAr: string
  categoryNameEn: string
  subcategoryId: string
  subcategoryNameAr: string
  subcategoryNameEn: string
  serviceIssueId: string | null
  issueNameAr: string | null
  issueNameEn: string | null
  matchedText: string
  confidence: number
  requiresDevice: boolean
  supportsMultiDevice: boolean
  basePrice: number | null
  pricingType: PricingType
  executionMode: ExecutionMode
  dynamicFields: DynamicFieldResponse[]
}
export interface SmartRequestAnalyzeResponse {
  smartRequestId: string
  text: string
  analyzer: string
  matches: SmartRequestMatch[]
  suggestions: ServiceCardResponse[]
}
export interface SmartRequestHistoryResponse {
  id: string
  inputText: string
  matchCount: number
  analyzer: string
  matches: SmartRequestMatch[]
  parentOrderId: string | null
  createdAt: string
}

// ── Common/ApiResponse.cs
export interface ApiResponse<T> {
  success: boolean
  message: string
  errorCode: string | null
  data: T | null
  totalCount: number | null
}

// ── Common/ErrorResponse.cs
export interface ErrorResponse {
  errorCode: string
  message: string
  details: unknown | null
}

// ── Common/LookupResponse.cs
export interface LookupResponse {
  id: string
  code: string | null
  nameAr: string
  nameEn: string
}
export interface PersonLookupResponse {
  id: string
  fullName: string
  phoneNumber: string | null
}

// ── Common/PaginatedRequest.cs
export interface PaginatedRequest {
  page?: number
  pageSize?: number
}

// ── Common/PaginatedResponse.cs
export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// ── Customers/CustomerAccountDtos.cs
export interface CustomerVerifyOtpRequest extends VerifyOtpRequest {
  preferredCulture?: string | null
}
export interface UpdateCustomerProfileRequest {
  fullName?: string | null
  email?: string | null
  preferredCulture?: string | null
}
export interface SaveAddressRequest {
  label: string
  city: string
  district?: string | null
  street?: string | null
  buildingNumber?: string | null
  apartmentNumber?: string | null
  notes?: string | null
  latitude?: number | null
  longitude?: number | null
  isDefault: boolean
}
export interface CustomerProfileResponse {
  id: string
  userId: string
  fullName: string
  phoneNumber: string | null
  email: string | null
  preferredCulture: string
  defaultAddressId: string | null
  completedOrdersCount: number
  createdAt: string
}
export interface CustomerAddressResponse {
  id: string
  label: string
  city: string
  district: string | null
  street: string | null
  buildingNumber: string | null
  apartmentNumber: string | null
  notes: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  createdAt: string
}

// ── Customers/CustomerCartDtos.cs
export interface AddCartItemRequest {
  canonicalServiceId: string
  serviceIssueId?: string | null
  customerDescription?: string | null
  dynamicFields?: Record<string, unknown> | null
  devices?: DeviceRequest[] | null
  smartRequestId?: string | null
}
export interface BulkAddCartItemsRequest {
  items: AddCartItemRequest[]
}
export interface UpdateCartItemRequest {
  serviceIssueId?: string | null
  customerDescription?: string | null
  dynamicFields?: Record<string, unknown> | null
  devices?: DeviceRequest[] | null
}
export interface CartMediaRequest {
  caption?: string | null
}
export interface CartResponse {
  orderId: string
  status: ParentOrderStatus
  source: OrderSource
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  items: CartItemResponse[]
}
export interface CartItemResponse {
  id: string
  sequence: number
  canonicalServiceId: string
  serviceCode: string | null
  serviceNameAr: string
  serviceNameEn: string
  categoryId: string
  subcategoryId: string
  serviceIssueId: string | null
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  baseAmount: number
  priceOnQuote: boolean
  customerDescription: string | null
  dynamicFields: Record<string, unknown>
  devices: DeviceResponse[]
  mediaCount: number
}

// ── Customers/CustomerCheckoutDtos.cs
export interface CheckoutRequest {
  addressId: string
  paymentMethod: PaymentMethod
  preferredStart?: string | null
  preferredEnd?: string | null
  customerNotes?: string | null
}
export interface RetryPaymentRequest {
  paymentMethod: PaymentMethod
}
export interface CheckoutSummaryResponse {
  orderId: string | null
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  hasPriceOnQuoteItems: boolean
  items: CheckoutSummaryItemResponse[]
  addresses: CustomerAddressResponse[]
  defaultAddressId: string | null
  paymentMethods: PaymentMethod[]
  earliestScheduleDate: string
}
export interface CheckoutSummaryItemResponse {
  id: string
  sequence: number
  serviceNameAr: string
  serviceNameEn: string
  pricingType: PricingType
  baseAmount: number
  priceOnQuote: boolean
  deviceCount: number
}

// ── Customers/CustomerOrderDtos.cs
export interface CustomerOrderListRequest extends PaginatedRequest {
  status?: ParentOrderStatus | null
}
export interface QuotationDecisionRequest {
  note?: string | null
}
export interface RejectQuotationRequest {
  note: string
}
export interface ConfirmCompletionRequest {
  note?: string | null
}
export interface CancelRequest {
  reason: string
}
export interface RescheduleRequest {
  preferredStart: string
  preferredEnd: string
}
export interface OrderSummaryResponse {
  id: string
  orderNumber: string | null
  status: ParentOrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  currency: string
  total: number
  itemCount: number
  createdAt: string
  items: OrderItemBriefResponse[]
}
export interface OrderItemBriefResponse {
  id: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
}
export interface OrderPaymentSummaryResponse {
  method: PaymentMethod | null
  status: PaymentStatus
  paidAmount: number
  refundedAmount: number
  paidAt: string | null
}
export interface OrderDetailResponse {
  id: string
  orderNumber: string | null
  status: ParentOrderStatus
  source: OrderSource
  address: OrderAddressResponse
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  payment: OrderPaymentSummaryResponse
  customerNotes: string | null
  createdAt: string
  checkedOutAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: CancellationInitiator | null
  cancellationReason: string | null
  canCancel: boolean
  items: ServiceItemCustomerView[]
}
export interface ServiceItemCustomerView {
  id: string
  orderId: string
  orderNumber: string | null
  itemNumber: string | null
  sequence: number
  serviceNameAr: string
  serviceNameEn: string
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  status: ServiceItemStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  baseAmount: number
  quotedAmount: number | null
  finalAmount: number
  refundedAmount: number
  provider: LookupResponse | null
  executor: PersonLookupResponse | null
  devices: DeviceResponse[]
  pendingQuotation: QuotationResponse | null
  customerDescription: string | null
  completionNotes: string | null
  hasReview: boolean
  warrantyId: string | null
  acceptedAt: string | null
  enRouteAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  executorCompletedAt: string | null
  customerConfirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: CancellationInitiator | null
  cancellationReason: string | null
  canCancel: boolean
  canConfirm: boolean
  canReview: boolean
  canReschedule: boolean
  createdAt: string
}
export interface ServiceItemCustomerDetailResponse {
  item: ServiceItemCustomerView
  timeline: TimelineEventResponse[]
  evidence: EvidenceResponse[]
  quotations: QuotationResponse[]
  schedules: ScheduleResponse[]
  workflow: ExecutionStepResponse[]
}
export interface ServiceItemTrackingResponse {
  serviceItemId: string
  status: ServiceItemStatus
  isLive: boolean
  executorName: string | null
  latitude: number | null
  longitude: number | null
  locationUpdatedAt: string | null
  destinationLatitude: number | null
  destinationLongitude: number | null
  distanceKm: number | null
  etaMinutes: number | null
  enRouteAt: string | null
  refreshSeconds: number
}
export interface OrderTimelineEventResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  event: TimelineEventResponse
}

// ── Executors/ExecutorEarningsDtos.cs
export interface ExecutorSettlementListRequest extends PaginatedRequest {
  status?: SettlementStatus | null
}
export interface EarningsItemListRequest extends PaginatedRequest {
  settled?: boolean | null
  completedFrom?: string | null
  completedTo?: string | null
}
export interface EarningsSummaryResponse {
  completedItemsThisMonth: number
  deliveredAmountThisMonth: number
  completedItemsAllTime: number
  deliveredAmountAllTime: number
  pendingNetAmount: number
  paidNetAmount: number
  lastSettlementAt: string | null
  lastPaidAt: string | null
}
export interface ExecutorSettlementLineResponse {
  id: string
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  grossAmount: number
  commissionAmount: number
  netAmount: number
}
export interface ExecutorSettlementResponse {
  id: string
  settlementNumber: string
  periodStart: string
  periodEnd: string
  grossAmount: number
  commissionAmount: number
  netAmount: number
  status: SettlementStatus
  paidAt: string | null
  paymentReference: string | null
  createdAt: string
  lines: ExecutorSettlementLineResponse[]
}
export interface EarningsItemResponse {
  id: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  finalAmount: number
  completedAt: string | null
  settled: boolean
  settlementNumber: string | null
}

// ── Executors/ExecutorEvidenceDtos.cs
export interface UploadEvidenceRequest {
  stage: EvidenceStage
  deviceId?: string | null
  caption?: string | null
}

// ── Executors/ExecutorJobDtos.cs
export interface UpdateAvailabilityRequest {
  availability: ExecutorAvailability
}
export interface UpdateLocationRequest {
  latitude: number
  longitude: number
}
export interface JobListRequest extends PaginatedRequest {
  status?: ServiceItemStatus[] | null
  scheduledFrom?: string | null
  scheduledTo?: string | null
}
export interface AcceptJobRequest {
  note?: string | null
}
export interface RejectJobRequest {
  note: string
}
export interface ArriveRequest {
  latitude?: number | null
  longitude?: number | null
}
export interface PauseJobRequest {
  reason: string
}
export interface UpdateDiagnosisRequest {
  diagnosisNotes: string
}
export interface CompleteJobRequest {
  completionNotes?: string | null
  collectedCash?: boolean | null
}
export interface ExecutorProfileResponse {
  id: string
  fullName: string
  phone: string | null
  organization: LookupResponse
  availability: ExecutorAvailability
  maxConcurrentJobs: number
  activeJobs: number
  capabilities: LookupResponse[]
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
}
export interface JobSummaryResponse {
  id: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  status: ServiceItemStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  city: string | null
  district: string | null
  customerFirstName: string | null
  deviceCount: number
  amount: number
  assignedAt: string | null
  requiresQuotation: boolean
  hasPendingQuotation: boolean
}
export interface JobCustomerResponse {
  fullName: string
  phone: string | null
  address: OrderAddressResponse
  notes: string | null
}
export interface JobServiceConfigResponse {
  requiresBeforeEvidence: boolean
  requiresAfterEvidence: boolean
  requiresCustomerConfirmation: boolean
  pricingType: PricingType
  basePrice: number | null
  warrantyDays: number | null
  estimatedDurationMinutes: number | null
}
export interface EvidenceGroupResponse {
  stage: EvidenceStage
  items: EvidenceResponse[]
}
export interface JobDetailResponse extends JobSummaryResponse {
  customer: JobCustomerResponse
  dynamicFields: Record<string, unknown> | null
  customerDescription: string | null
  completionNotes: string | null
  isMarketplace: boolean
  statusBeforeHold: ServiceItemStatus | null
  devices: DeviceResponse[]
  serviceConfig: JobServiceConfigResponse
  workflow: ExecutionStepResponse[]
  timeline: TimelineEventResponse[]
  evidence: EvidenceGroupResponse[]
  quotations: QuotationResponse[]
  currentQuotation: QuotationResponse | null
  customerRequestMedia: EvidenceResponse[]
  availableActions: string[]
}

// ── Executors/ExecutorQuotationDtos.cs
export interface QuotationLineRequest {
  catalogPriceItemId?: string | null
  description?: string | null
  itemType?: PriceItemType | null
  quantity: number
  unitPrice?: number | null
}
export interface SaveQuotationRequest {
  notes?: string | null
  discountAmount: number
  expiresInHours: number
  items: QuotationLineRequest[]
}

// ── Finance/PaymentDtos.cs
export interface PaymentListRequest extends PaginatedRequest {
  status?: PaymentStatus | null
  method?: PaymentMethod | null
  orderNumber?: string | null
  from?: string | null
  to?: string | null
}
export interface MarkPaymentPaidRequest {
  reference?: string | null
  note?: string | null
}
export interface PaymentResponse {
  id: string
  paymentNumber: string
  parentOrderId: string
  orderNumber: string | null
  customerName: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  currency: string
  refundedAmount: number
  gatewayReference: string | null
  failureReason: string | null
  paidAt: string | null
  createdAt: string
}

// ── Finance/RefundDtos.cs
export interface RefundListRequest extends PaginatedRequest {
  status?: RefundStatus | null
  orderNumber?: string | null
}
export interface CustomerRefundListRequest extends PaginatedRequest {
  status?: RefundStatus | null
}
export interface CreateRefundRequest {
  parentOrderId: string
  serviceItemId?: string | null
  amount: number
  reason: string
}
export interface ApproveRefundRequest {
  notes?: string | null
}
export interface RejectRefundRequest {
  notes: string
}
export interface RequestItemRefundRequest {
  reason: string
}
export interface RefundResponse {
  id: string
  refundNumber: string
  parentOrderId: string
  orderNumber: string | null
  serviceItemId: string | null
  itemNumber: string | null
  serviceNameAr: string | null
  serviceNameEn: string | null
  paymentId: string | null
  paymentNumber: string | null
  paymentMethod: PaymentMethod | null
  amount: number
  reason: string
  status: RefundStatus
  reviewNotes: string | null
  gatewayReference: string | null
  processedAt: string | null
  createdAt: string
}

// ── Finance/SettlementDtos.cs
export interface GenerateSettlementsRequest {
  periodStart: string
  periodEnd: string
  providerOrganizationId?: string | null
  includeExecutorSettlements: boolean
}
export interface SettlementPreviewRequest {
  periodStart: string
  periodEnd: string
  providerOrganizationId?: string | null
}
export interface SettlementListRequest extends PaginatedRequest {
  status?: SettlementStatus | null
  providerOrganizationId?: string | null
  partyType?: SettlementPartyType | null
  periodFrom?: string | null
  periodTo?: string | null
}
export interface ProviderSettlementListRequest extends PaginatedRequest {
  status?: SettlementStatus | null
  partyType?: SettlementPartyType | null
}
export interface HoldSettlementRequest {
  notes: string
}
export interface MarkSettlementPaidRequest {
  paymentReference: string
  notes?: string | null
}
export interface SettlementResponse {
  id: string
  settlementNumber: string
  partyType: SettlementPartyType
  providerOrganizationId: string
  providerName: string
  executorId: string | null
  executorName: string | null
  periodStart: string
  periodEnd: string
  grossAmount: number
  commissionAmount: number
  netAmount: number
  status: SettlementStatus
  linesCount: number
  approvedAt: string | null
  paidAt: string | null
  paymentReference: string | null
  notes: string | null
  createdAt: string
}
export interface SettlementLineResponse {
  id: string
  serviceItemId: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  executorName: string | null
  completedAt: string | null
  grossAmount: number
  commissionAmount: number
  netAmount: number
}
export interface SettlementDetailResponse extends SettlementResponse {
  lines: SettlementLineResponse[]
}
export interface SettlementPreviewResponse {
  providerOrganizationId: string
  providerName: string
  itemsCount: number
  grossAmount: number
  commissionAmount: number
  netAmount: number
  lines: SettlementLineResponse[]
}
export interface ProviderSettlementSummaryResponse {
  settlementsCount: number
  pendingNetAmount: number
  paidNetAmount: number
  unsettledGrossAmount: number
  unsettledItemsCount: number
  lastSettlementAt: string | null
  lastPaidAt: string | null
}

// ── Finance/WarrantyDtos.cs
export interface WarrantyListRequest extends PaginatedRequest {
  status?: WarrantyStatus | null
  customerId?: string | null
  providerOrganizationId?: string | null
  orderNumber?: string | null
}
export interface CustomerWarrantyListRequest extends PaginatedRequest {
  status?: WarrantyStatus | null
}
export interface ClaimWarrantyRequest {
  description: string
}
export interface VoidWarrantyRequest {
  notes: string
}
export interface ResolveWarrantyClaimRequest {
  createReworkItem: boolean
  notes: string
}
export interface WarrantyResponse {
  id: string
  warrantyNumber: string
  serviceItemId: string
  itemNumber: string | null
  parentOrderId: string
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  customerId: string
  customerName: string | null
  providerOrganizationId: string | null
  providerName: string | null
  startsAt: string
  endsAt: string
  status: WarrantyStatus
  daysRemaining: number
  termsAr: string | null
  termsEn: string | null
  claimedAt: string | null
  claimDescription: string | null
  claimServiceItemId: string | null
  createdAt: string
}

// ── Marketplace/MarketplaceDtos.cs
export interface PublishMarketplaceRequest {
  serviceItemId: string
  publicDescription: string
  closesAt?: string | null
}
export interface MarketplaceRequestListRequest extends PaginatedRequest {
  status?: MarketplaceRequestStatus | null
}
export interface AwardMarketplaceOfferRequest {
  offerId: string
  reason?: string | null
}
export interface ProviderMarketplaceListRequest extends PaginatedRequest {
  search?: string | null
}
export interface SubmitMarketplaceOfferRequest {
  amount: number
  estimatedDurationMinutes?: number | null
  proposedStart?: string | null
  note?: string | null
}
export interface ProviderOfferListRequest extends PaginatedRequest {
  status?: MarketplaceOfferStatus | null
}
export interface MarketplaceOfferResponse {
  id: string
  providerOrganizationId: string
  providerName: string
  providerRating: number
  providerCompletedItemsCount: number
  amount: number
  estimatedDurationMinutes: number | null
  proposedStart: string | null
  note: string | null
  status: MarketplaceOfferStatus
  submittedAt: string
  respondedAt: string | null
}
export interface MarketplaceRequestResponse {
  id: string
  requestNumber: string
  status: MarketplaceRequestStatus
  serviceItemId: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  itemStatus: ServiceItemStatus
  city: string | null
  district: string | null
  publicDescription: string
  baseAmount: number
  scheduledStart: string | null
  scheduledEnd: string | null
  publishedAt: string
  closesAt: string | null
  awardedOfferId: string | null
  offersCount: number
  createdAt: string
}
export interface MarketplaceRequestDetailResponse extends MarketplaceRequestResponse {
  customerDescription: string | null
  offers: MarketplaceOfferResponse[]
}
export interface ProviderMarketplaceRequestResponse {
  id: string
  requestNumber: string
  status: MarketplaceRequestStatus
  publicDescription: string
  serviceNameAr: string
  serviceNameEn: string
  category: LookupResponse
  executionMode: ExecutionMode
  city: string | null
  district: string | null
  preferredStart: string | null
  preferredEnd: string | null
  publishedAt: string
  closesAt: string | null
  offersCount: number
  myOffer: MarketplaceOfferResponse | null
}
export interface ProviderOfferResponse {
  id: string
  requestId: string
  requestNumber: string
  requestStatus: MarketplaceRequestStatus
  publicDescription: string
  serviceNameAr: string
  serviceNameEn: string
  itemNumber: string | null
  itemStatus: ServiceItemStatus
  amount: number
  estimatedDurationMinutes: number | null
  proposedStart: string | null
  note: string | null
  status: MarketplaceOfferStatus
  submittedAt: string
  respondedAt: string | null
  executorName: string | null
  completedAt: string | null
  settlementNumber: string | null
}

// ── Notifications/NotificationDtos.cs
export interface CreateNotificationRequest {
  userId: string
  title: string
  body: string
  type: NotificationType
  referenceId?: string | null
  referenceType?: string | null
}
export interface NotificationListRequest extends PaginatedRequest {
  isRead?: boolean | null
  type?: NotificationType | null
}
export interface NotificationResponse {
  id: string
  title: string
  body: string
  type: NotificationType
  isRead: boolean
  readAt: string | null
  referenceId: string | null
  referenceType: string | null
  createdAt: string
}
export interface UnreadCountResponse {
  count: number
}

// ── Operations/AdminOrderDtos.cs
export interface AdminOrderListRequest extends PaginatedRequest {
  status?: ParentOrderStatus | null
  paymentStatus?: PaymentStatus | null
  source?: OrderSource | null
  search?: string | null
  orderNumber?: string | null
  createdFrom?: string | null
  createdTo?: string | null
  includeDrafts?: boolean
}
export interface AdminServiceItemListRequest extends PaginatedRequest {
  status?: ServiceItemStatus[] | null
  providerOrganizationId?: string | null
  executorId?: string | null
  categoryId?: string | null
  canonicalServiceId?: string | null
  city?: string | null
  scheduledFrom?: string | null
  scheduledTo?: string | null
  search?: string | null
}
export interface AdminCancelRequest {
  reason: string
}
export interface PauseRequest {
  reason: string
}
export interface ForceStatusRequest {
  status: ServiceItemStatus
  reason: string
}
export interface ScheduleItemRequest {
  scheduledStart: string
  scheduledEnd: string
  note?: string | null
}
export interface AdminUnassignRequest {
  reason?: string | null
  alsoProvider: boolean
}
export interface LiveOperationsRequest {
  city?: string | null
  providerOrganizationId?: string | null
  status?: ServiceItemStatus | null
}
export interface ReportRangeRequest {
  from?: string | null
  to?: string | null
}
export interface StatusCountResponse {
  status: ServiceItemStatus
  count: number
}
export interface AdminOrderItemBriefResponse {
  id: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  providerName: string | null
  executorName: string | null
  finalAmount: number
}
export interface AdminOrderListItemResponse {
  id: string
  orderNumber: string | null
  status: ParentOrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  source: OrderSource
  customer: PersonLookupResponse
  city: string | null
  district: string | null
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  itemCount: number
  createdAt: string
  checkedOutAt: string | null
  paidAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  items: AdminOrderItemBriefResponse[]
}
export interface AdminCustomerResponse {
  id: string
  userId: string
  fullName: string
  phoneNumber: string | null
  email: string | null
  completedOrdersCount: number
}
export interface AdminPaymentResponse {
  id: string
  paymentNumber: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  currency: string
  gatewayReference: string | null
  failureReason: string | null
  paidAt: string | null
  createdAt: string
}
export interface AdminRefundResponse {
  id: string
  refundNumber: string
  serviceItemId: string | null
  paymentId: string | null
  amount: number
  reason: string
  status: RefundStatus
  processedAt: string | null
  createdAt: string
}
export interface OrderTimelineRowResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  event: TimelineEventResponse
}
export interface ServiceItemAdminView {
  id: string
  orderId: string
  orderNumber: string | null
  itemNumber: string | null
  sequence: number
  canonicalServiceId: string
  categoryId: string
  subcategoryId: string
  serviceNameAr: string
  serviceNameEn: string
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  requiresCustomerConfirmation: boolean
  customerDescription: string | null
  dynamicFieldsJson: string | null
  status: ServiceItemStatus
  statusBeforeHold: ServiceItemStatus | null
  customer: PersonLookupResponse
  address: OrderAddressResponse
  provider: LookupResponse | null
  executor: PersonLookupResponse | null
  executorAssignmentDelegated: boolean
  isMarketplace: boolean
  scheduledStart: string | null
  scheduledEnd: string | null
  baseAmount: number
  quotedAmount: number | null
  finalAmount: number
  refundedAmount: number
  commissionRate: number | null
  commissionAmount: number
  providerNetAmount: number
  acceptedAt: string | null
  enRouteAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  executorCompletedAt: string | null
  customerConfirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: CancellationInitiator | null
  cancellationReason: string | null
  completionNotes: string | null
  devices: DeviceResponse[]
  currentAssignment: AssignmentResponse | null
  pendingQuotation: QuotationResponse | null
  hasDispute: boolean
  hasReview: boolean
  warrantyId: string | null
  createdAt: string
  updatedAt: string | null
}
export interface AdminOrderDetailResponse {
  id: string
  orderNumber: string | null
  status: ParentOrderStatus
  source: OrderSource
  customer: AdminCustomerResponse
  address: OrderAddressResponse
  currency: string
  subtotal: number
  discountTotal: number
  total: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  sourceText: string | null
  customerNotes: string | null
  createdAt: string
  checkedOutAt: string | null
  paidAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: CancellationInitiator | null
  cancellationReason: string | null
  payments: AdminPaymentResponse[]
  refunds: AdminRefundResponse[]
  items: ServiceItemAdminView[]
  timeline: OrderTimelineRowResponse[]
}
export interface ServiceItemAdminDetailResponse {
  item: ServiceItemAdminView
  timeline: TimelineEventResponse[]
  evidence: EvidenceResponse[]
  quotations: QuotationResponse[]
  assignments: AssignmentResponse[]
  schedules: ScheduleResponse[]
  workflow: ExecutionStepResponse[]
}
export interface LiveServiceItemResponse {
  id: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  provider: LookupResponse | null
  executor: PersonLookupResponse | null
  executorLatitude: number | null
  executorLongitude: number | null
  executorLocationAt: string | null
  customerCity: string | null
  customerDistrict: string | null
  customerLatitude: number | null
  customerLongitude: number | null
  scheduledStart: string | null
  scheduledEnd: string | null
  lastEventType: string | null
  lastEventAt: string | null
  minutesSinceLastEvent: number | null
}
export interface LiveOperationsResponse {
  generatedAt: string
  totalActive: number
  counts: StatusCountResponse[]
  items: LiveServiceItemResponse[]
}
export interface AttentionItemResponse {
  id: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  reason: string
  provider: LookupResponse | null
  executor: PersonLookupResponse | null
  city: string | null
  inStatusSince: string
  minutesInStatus: number
}
export interface PeriodMetricsResponse {
  from: string
  to: string
  newOrders: number
  completedItems: number
  cancelledItems: number
  revenue: number
  refunds: number
}
export interface DashboardSummaryResponse {
  generatedAt: string
  today: PeriodMetricsResponse
  week: PeriodMetricsResponse
  month: PeriodMetricsResponse
  itemsByStatus: StatusCountResponse[]
  activeProviders: number
  activeExecutors: number
  openDisputes: number
  pendingProviderApplications: number
  averageRating: number
}
export interface ServiceReportRowResponse {
  canonicalServiceId: string
  categoryId: string
  serviceNameAr: string
  serviceNameEn: string
  itemCount: number
  completedCount: number
  cancelledCount: number
  revenue: number
  averageRating: number
}
export interface ServicesReportResponse {
  from: string
  to: string
  rows: ServiceReportRowResponse[]
}
export interface ProviderReportRowResponse {
  providerOrganizationId: string
  displayName: string
  itemCount: number
  completedCount: number
  cancelledCount: number
  rejectedCount: number
  grossAmount: number
  commissionAmount: number
  netAmount: number
  averageRating: number
}
export interface ProvidersReportResponse {
  from: string
  to: string
  rows: ProviderReportRowResponse[]
}

// ── Operations/CoverageDtos.cs
export interface CoverageMapRequest {
  canonicalServiceId?: string | null
  providerOrganizationId?: string | null
  includeNonOperational: boolean
}
export interface CoverageCheckRequest {
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  district?: string | null
  canonicalServiceId?: string | null
  isMarketplace: boolean
}
export interface CatalogAvailabilityRequest {
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  district?: string | null
}
export interface CoverageMapResponse {
  generatedAt: string
  providers: CoverageMapProviderResponse[]
}
export interface CoverageMapProviderResponse {
  providerOrganizationId: string
  displayName: string
  type: ProviderType
  verificationStatus: ProviderVerificationStatus
  isOperational: boolean
  businessModel: ProviderBusinessModel
  isDemo: boolean
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
  capacity: number
  activeItems: number
  activeExecutors: number
  availableExecutors: number
  baseLatitude: number | null
  baseLongitude: number | null
  categoryCodes: string[]
  servicesCount: number
  capabilities: LookupResponse[]
  areas: CoverageAreaResponse[]
}
export interface CoverageCheckResponse {
  latitude: number | null
  longitude: number | null
  city: string | null
  district: string | null
  canonicalServiceId: string | null
  serviceNameAr: string | null
  serviceNameEn: string | null
  coveringProvidersCount: number
  eligibleProvidersCount: number
  candidates: ProviderCandidateResponse[]
}
export interface CatalogAvailabilityResponse {
  isCovered: boolean
  providersCount: number
  availableServiceIds: string[]
  availableSubcategoryIds: string[]
  availableCategoryIds: string[]
}
export interface AutoAssignRunResponse {
  scanned: number
  assigned: number
  noEligibleProvider: number
  failed: number
  assignedItems: string[]
}
export interface DemoProvidersResponse {
  created: boolean
  organizationsCount: number
  executorsCount: number
  organizations: DemoProviderResponse[]
}
export interface DemoProviderResponse {
  providerOrganizationId: string
  displayName: string
  tenantCode: string
  zoneName: string
  categoryCode: string
  ownerPhone: string
  executorPhones: string[]
  areasCount: number
  isActive: boolean
}
export interface DemoRetireResponse {
  retiredOrganizations: number
  deactivatedUsers: number
}
export interface DemoCoverageRebuildResponse {
  organizations: number
  areasRemoved: number
  areasCreated: number
  districtsCount: number
}
export interface DemoReactivateResponse {
  reactivatedOrganizations: number
  activatedUsers: number
}

// ── Operations/ProviderWorkDtos.cs
export interface ProviderWorkListRequest extends PaginatedRequest {
  status?: ServiceItemStatus[] | null
  executorId?: string | null
  scheduledFrom?: string | null
  scheduledTo?: string | null
  search?: string | null
}
export interface ProviderRejectRequest {
  note: string
}
export interface IncomingWorkItemResponse {
  id: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  status: ServiceItemStatus
  city: string | null
  district: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  finalAmount: number
  commissionRate: number | null
  netAmount: number
  isMarketplace: boolean
  executorAssignmentDelegated: boolean
  customerDescription: string | null
  deviceCount: number
  assignedAt: string | null
  createdAt: string
}
export interface ServiceItemProviderView {
  id: string
  orderId: string
  orderNumber: string | null
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  requiresCustomerConfirmation: boolean
  status: ServiceItemStatus
  statusBeforeHold: ServiceItemStatus | null
  customer: PersonLookupResponse
  address: OrderAddressResponse
  executor: PersonLookupResponse | null
  executorAssignmentDelegated: boolean
  isMarketplace: boolean
  scheduledStart: string | null
  scheduledEnd: string | null
  baseAmount: number
  quotedAmount: number | null
  finalAmount: number
  refundedAmount: number
  commissionRate: number | null
  netAmount: number
  customerDescription: string | null
  dynamicFieldsJson: string | null
  completionNotes: string | null
  acceptedAt: string | null
  enRouteAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  executorCompletedAt: string | null
  customerConfirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelledBy: CancellationInitiator | null
  cancellationReason: string | null
  devices: DeviceResponse[]
  currentAssignment: AssignmentResponse | null
  pendingQuotation: QuotationResponse | null
  hasDispute: boolean
  createdAt: string
  updatedAt: string | null
}
export interface ServiceItemProviderDetailResponse {
  item: ServiceItemProviderView
  timeline: TimelineEventResponse[]
  evidence: EvidenceResponse[]
  quotations: QuotationResponse[]
  assignments: AssignmentResponse[]
  schedules: ScheduleResponse[]
  workflow: ExecutionStepResponse[]
}
export interface ScheduledItemResponse {
  id: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  executor: PersonLookupResponse | null
  city: string | null
  district: string | null
}
export interface ExecutorLoadResponse {
  executorId: string
  userId: string
  fullName: string
  phoneNumber: string | null
  availability: ExecutorAvailability
  isActive: boolean
  maxConcurrentJobs: number
  activeJobs: number
  averageRating: number
}
export interface ProviderWorkBoardResponse {
  generatedAt: string
  capacity: number
  activeItems: number
  incomingCount: number
  itemsByStatus: StatusCountResponse[]
  todaySchedule: ScheduledItemResponse[]
  executors: ExecutorLoadResponse[]
}

// ── Orders/SharedOrderDtos.cs
export interface DeviceRequest {
  name: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  issueDescription?: string | null
}
export interface DeviceResponse {
  id: string
  sequence: number
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  issueDescription: string | null
  diagnosisNotes: string | null
}
export interface TimelineEventResponse {
  id: string
  eventType: string
  fromStatus: ServiceItemStatus | null
  toStatus: ServiceItemStatus | null
  actorType: ActorType
  actorName: string | null
  note: string | null
  metadataJson: string | null
  createdAt: string
}
export interface EvidenceResponse {
  id: string
  deviceId: string | null
  stage: EvidenceStage
  type: EvidenceType
  uploadedByType: ActorType
  url: string
  caption: string | null
  createdAt: string
}
export interface QuotationItemResponse {
  id: string
  catalogPriceItemId: string | null
  itemType: PriceItemType
  description: string
  quantity: number
  unitPrice: number
  total: number
}
export interface QuotationResponse {
  id: string
  quotationNumber: string
  serviceItemId: string
  status: QuotationStatus
  subtotal: number
  discountAmount: number
  total: number
  notes: string | null
  sentAt: string | null
  expiresAt: string | null
  respondedAt: string | null
  customerResponseNote: string | null
  createdAt: string
  items: QuotationItemResponse[]
}
export interface ScheduleResponse {
  id: string
  scheduledStart: string
  scheduledEnd: string
  isCurrent: boolean
  scheduledByType: ActorType
  note: string | null
  createdAt: string
}
export interface ExecutionStepResponse {
  step: ExecutionStep
  entersStatus: ServiceItemStatus | null
  evidenceStage: EvidenceStage | null
  optional: boolean
  state: string
}
export interface OrderAddressResponse {
  label: string | null
  city: string | null
  district: string | null
  addressLine: string | null
  latitude: number | null
  longitude: number | null
}

// ── Providers/AdminUserDtos.cs
export interface AdminUserListRequest extends PaginatedRequest {
  role?: Role | null
  status?: UserStatus | null
  activeFilter?: ActiveFilter | null
  search?: string | null
}
export interface CreatePlatformAdminRequest {
  fullName: string
  username: string
  password: string
  email?: string | null
  phone?: string | null
  staffRoleId: string
}
export interface UpdatePlatformAdminRequest {
  fullName: string
  email?: string | null
  phone?: string | null
  staffRoleId: string
}
export interface SetUserStatusRequest {
  status: UserStatus
}
export interface SetUserActiveRequest {
  isActive: boolean
}
export interface AdminResetPasswordRequest {
  newPassword: string
}
export interface AdminUserResponse {
  id: string
  username: string
  fullName: string
  email: string | null
  phone: string | null
  role: Role
  status: UserStatus
  isActive: boolean
  tenantId: string | null
  tenantCode: string | null
  createdAt: string
  lastLoginAt: string | null
  staffRoleId: string | null
  staffRoleNameAr: string | null
  staffRoleNameEn: string | null
}

// ── Providers/ProviderAdminDtos.cs
export interface ProviderAdminListRequest extends PaginatedRequest {
  verificationStatus?: ProviderVerificationStatus | null
  businessModel?: ProviderBusinessModel | null
  type?: ProviderType | null
  city?: string | null
  search?: string | null
}
export interface ApproveProviderRequest {
  notes?: string | null
  commissionRate?: number | null
  businessModel?: ProviderBusinessModel | null
}
export interface StartProviderTrialRequest {
  trialEndsAt: string
  notes?: string | null
}
export interface ProviderReviewNotesRequest {
  notes: string
}
export interface AdminCreateProviderRequest {
  type: ProviderType
  legalName: string
  displayName: string
  ownerPhone: string
  ownerFullName: string
  email?: string | null
  city: string
  address?: string | null
  commercialRegistrationNumber?: string | null
  taxNumber?: string | null
  businessModel: ProviderBusinessModel
  capabilityIds: string[]
  capacity?: number | null
  commissionRate?: number | null
  approveNow: boolean
}
export interface UpdateProviderSettingsRequest {
  commissionRate?: number | null
  capacity?: number | null
  delegateExecutorAssignmentToPlatform?: boolean | null
  storeModuleEnabled?: boolean | null
  businessModel?: ProviderBusinessModel | null
  baseLatitude?: number | null
  baseLongitude?: number | null
}
export interface ReviewProviderDocumentRequest {
  notes?: string | null
}
export interface ProviderAdminListItemResponse {
  id: string
  tenantCode: string
  type: ProviderType
  legalName: string
  displayName: string
  phone: string
  city: string | null
  verificationStatus: ProviderVerificationStatus
  businessModel: ProviderBusinessModel
  tenantIsActive: boolean
  capacity: number
  executorsCount: number
  activeItems: number
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
  submittedAt: string | null
  isDemo: boolean
  createdAt: string
}
export interface ProviderTenantResponse {
  id: string
  code: string
  name: string
  isActive: boolean
  subscriptionExpiresAt: string | null
}
export interface ExecutorSummaryResponse {
  id: string
  userId: string
  fullName: string
  phone: string | null
  specialization: string | null
  availability: ExecutorAvailability
  maxConcurrentJobs: number
  activeJobs: number
  capabilities: LookupResponse[]
  averageRating: number
  completedItemsCount: number
  isActive: boolean
}
export interface ProviderAdminDetailResponse {
  profile: ProviderOrganizationResponse
  tenant: ProviderTenantResponse
  reviewedByUserId: string | null
  documents: ProviderDocumentResponse[]
  capabilities: LookupResponse[]
  coverageAreas: CoverageAreaResponse[]
  members: TeamMemberResponse[]
  executors: ExecutorSummaryResponse[]
  activeItems: number
  pendingAssignments: number
  totalItems: number
}

// ── Providers/ProviderOrganizationDtos.cs
export interface UpdateProviderProfileRequest {
  legalName: string
  displayName: string
  phone: string
  email?: string | null
  city: string
  address?: string | null
  description?: string | null
  commercialRegistrationNumber?: string | null
  taxNumber?: string | null
}
export interface UploadProviderDocumentRequest {
  type: ProviderDocumentType
  documentNumber?: string | null
  expiresAt?: string | null
}
export interface UpdateProviderCapabilitiesRequest {
  capabilityIds: string[]
}
export interface CoverageAreaRequest {
  name?: string | null
  city: string
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  radiusKm?: number | null
  polygon?: GeoPoint[] | null
}
export interface GeoPoint {
  latitude: number
  longitude: number
}
export interface UpdateProviderOperationsRequest {
  capacity: number
  delegateExecutorAssignmentToPlatform: boolean
}
export interface UpdateProviderBusinessModelRequest {
  businessModel: ProviderBusinessModel
}
export interface OnboardingStepsResponse {
  profileComplete: boolean
  documentsUploaded: boolean
  capabilitiesSet: boolean
  coverageSet: boolean
  capacitySet: boolean
  businessModelSet: boolean
  canSubmit: boolean
}
export interface ProviderOrganizationResponse {
  id: string
  tenantCode: string
  type: ProviderType
  legalName: string
  displayName: string
  commercialRegistrationNumber: string | null
  taxNumber: string | null
  phone: string
  email: string | null
  city: string | null
  address: string | null
  description: string | null
  logoUrl: string | null
  verificationStatus: ProviderVerificationStatus
  businessModel: ProviderBusinessModel
  submittedAt: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  trialEndsAt: string | null
  capacity: number
  delegateExecutorAssignmentToPlatform: boolean
  commissionRate: number
  storeModuleEnabled: boolean
  baseLatitude: number | null
  baseLongitude: number | null
  isDemo: boolean
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
  documentsCount: number
  capabilitiesCount: number
  coverageAreasCount: number
  membersCount: number
  executorsCount: number
  createdAt: string
  updatedAt: string | null
  steps: OnboardingStepsResponse
}
export interface ProviderDocumentResponse {
  id: string
  type: ProviderDocumentType
  url: string
  documentNumber: string | null
  expiresAt: string | null
  status: ProviderDocumentStatus
  reviewNotes: string | null
  reviewedAt: string | null
  uploadedAt: string
}
export interface CoverageAreaResponse {
  id: string
  name: string | null
  shape: CoverageShape
  city: string
  district: string | null
  latitude: number | null
  longitude: number | null
  radiusKm: number | null
  polygon: GeoPoint[]
  isActive: boolean
}
export interface ServiceItemStatusCountResponse {
  status: ServiceItemStatus
  count: number
}
export interface ProviderDashboardResponse {
  verificationStatus: ProviderVerificationStatus
  trialEndsAt: string | null
  capacity: number
  activeItems: number
  pendingAssignments: number
  todayScheduledItems: number
  activeExecutors: number
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
  itemsByStatus: ServiceItemStatusCountResponse[]
}
export interface ProviderCapabilitiesResponse {
  capabilities: LookupResponse[]
}

// ── Providers/ProviderRegistrationDtos.cs
export interface ProviderRegistrationRequest {
  type: ProviderType
  legalName: string
  displayName: string
  phone: string
  email?: string | null
  city: string
  ownerFullName: string
  otpCode: string
  deviceId?: string | null
  businessModel: ProviderBusinessModel
}
export interface ProviderRegistrationResponse {
  providerOrganizationId: string
  tenantCode: string
  phoneNumber: string
  session: AuthResponse
}

// ── Providers/ProviderTeamDtos.cs
export interface CreateSupervisorRequest {
  fullName: string
  phone: string
  email?: string | null
}
export interface CreateExecutorRequest {
  fullName: string
  phone: string
  email?: string | null
  specialization?: string | null
  maxConcurrentJobs: number
  capabilityIds: string[]
}
export interface ExecutorListRequest extends PaginatedRequest {
  availability?: ExecutorAvailability | null
  activeFilter?: ActiveFilter | null
  search?: string | null
}
export interface UpdateExecutorRequest {
  fullName: string
  phone: string
  email?: string | null
  specialization?: string | null
  maxConcurrentJobs: number
}
export interface UpdateExecutorCapabilitiesRequest {
  capabilityIds: string[]
}
export interface SetExecutorActiveRequest {
  isActive: boolean
}
export interface SetExecutorAvailabilityRequest {
  availability: ExecutorAvailability
}
export interface TeamMemberResponse {
  id: string
  userId: string
  fullName: string
  username: string
  phone: string | null
  email: string | null
  role: ProviderMemberRole
  isActive: boolean
  joinedAt: string
  executorId: string | null
}
export interface ExecutorResponse {
  id: string
  userId: string
  fullName: string
  username: string
  phone: string | null
  email: string | null
  specialization: string | null
  availability: ExecutorAvailability
  maxConcurrentJobs: number
  activeJobs: number
  capabilities: LookupResponse[]
  averageRating: number
  ratingsCount: number
  completedItemsCount: number
  isActive: boolean
  createdAt: string
}

// ── Quality/DisputeDtos.cs
export interface CreateDisputeRequest {
  parentOrderId: string
  serviceItemId?: string | null
  subject: string
  description: string
}
export interface DisputeListRequest extends PaginatedRequest {
  status?: DisputeStatus | null
  orderNumber?: string | null
  from?: string | null
  to?: string | null
}
export interface CustomerDisputeListRequest extends PaginatedRequest {
  status?: DisputeStatus | null
}
export interface ProviderDisputeListRequest extends PaginatedRequest {
  status?: DisputeStatus | null
}
export interface EscalateDisputeRequest {
  notes: string
}
export interface ResolveDisputeRequest {
  resolutionType: DisputeResolutionType
  refundAmount?: number | null
  resolutionNote: string
}
export interface RejectDisputeRequest {
  notes: string
}
export interface DisputeResponse {
  id: string
  disputeNumber: string
  parentOrderId: string
  orderNumber: string | null
  serviceItemId: string | null
  itemNumber: string | null
  serviceNameAr: string | null
  serviceNameEn: string | null
  subject: string
  description: string
  status: DisputeStatus
  resolutionType: DisputeResolutionType
  resolutionNote: string | null
  refundAmount: number | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string | null
}
export interface DisputeOrderSummaryResponse {
  id: string
  orderNumber: string | null
  status: ParentOrderStatus
  total: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  createdAt: string
}
export interface DisputeItemSummaryResponse {
  id: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  statusBeforeHold: ServiceItemStatus | null
  finalAmount: number
  refundedAmount: number
  completedAt: string | null
  completionNotes: string | null
}
export interface DisputeDetailResponse extends DisputeResponse {
  order: DisputeOrderSummaryResponse
  item: DisputeItemSummaryResponse | null
  customer: PersonLookupResponse
  provider: LookupResponse | null
  executor: PersonLookupResponse | null
  timeline: TimelineEventResponse[]
}

// ── Quality/ReviewDtos.cs
export interface CreateReviewRequest {
  serviceRating: number
  executorRating?: number | null
  comment?: string | null
}
export interface ReviewListRequest extends PaginatedRequest {
  providerOrganizationId?: string | null
  executorId?: string | null
  minRating?: number | null
  maxRating?: number | null
  isPublished?: boolean | null
}
export interface ProviderReviewListRequest extends PaginatedRequest {
  executorId?: string | null
}
export interface SetReviewPublishedRequest {
  isPublished: boolean
}
export interface ReviewResponse {
  id: string
  serviceItemId: string
  itemNumber: string | null
  orderNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  customerId: string
  customerName: string | null
  executorId: string | null
  executorName: string | null
  providerOrganizationId: string | null
  providerName: string | null
  serviceRating: number
  executorRating: number | null
  comment: string | null
  isPublished: boolean
  createdAt: string
}
export interface ExecutorReviewSummaryResponse {
  executorId: string
  fullName: string
  averageRating: number
  ratingsCount: number
}
export interface ReviewSummaryResponse {
  averageRating: number
  ratingsCount: number
  distribution: number[]
  executors: ExecutorReviewSummaryResponse[]
}

// ── Staff/StaffDtos.cs
export interface SaveStaffRoleRequest {
  nameAr: string
  nameEn: string
  description?: string | null
  permissions: string[]
}
export interface PermissionResponse {
  code: string
  nameAr: string
  nameEn: string
  implies: string | null
}
export interface PermissionGroupResponse {
  code: string
  nameAr: string
  nameEn: string
  permissions: PermissionResponse[]
}
export interface StaffRoleResponse {
  id: string
  code: string | null
  nameAr: string
  nameEn: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  membersCount: number
  createdAt: string
  updatedAt: string | null
}

// ── Store/StoreDtos.cs
export interface StoreProductListRequest extends PaginatedRequest {
  status?: ActiveFilter | null
  providerOrganizationId?: string | null
  search?: string | null
}
export interface UpdateStoreProductRequest {
  sku: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  price: number
  requiresDelivery: boolean
  requiresInstallation: boolean
  installationServiceId?: string | null
  deliveryServiceId?: string | null
}
export interface CreateStoreProductRequest extends UpdateStoreProductRequest {
  stockQuantity: number
}
export interface SetStoreProductActiveRequest {
  isActive: boolean
}
export interface AdjustStockRequest {
  delta: number
}
export interface StoreOrderListRequest extends PaginatedRequest {
  status?: StoreOrderStatus | null
  search?: string | null
  orderNumber?: string | null
}
export interface UpdateStoreOrderStatusRequest {
  status: StoreOrderStatus
  reason?: string | null
}
export interface StoreCatalogRequest extends PaginatedRequest {
  search?: string | null
  includeOutOfStock?: boolean
}
export interface AddStoreCartItemRequest {
  productId: string
  quantity: number
}
export interface UpdateStoreCartItemRequest {
  quantity: number
}
export interface StoreCheckoutRequest {
  addressId: string
  paymentMethod: PaymentMethod
  customerNotes?: string | null
}
export interface StoreRetryPaymentRequest {
  paymentMethod: PaymentMethod
}
export interface CustomerStoreOrderListRequest extends PaginatedRequest {
  status?: StoreOrderStatus | null
}
export interface StoreProductResponse {
  id: string
  sku: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  price: number
  stockQuantity: number
  imageUrl: string | null
  providerOrganizationId: string | null
  providerName: string | null
  requiresDelivery: boolean
  requiresInstallation: boolean
  installationServiceId: string | null
  deliveryServiceId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}
export interface StoreProductCardResponse {
  id: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  price: number
  currency: string
  imageUrl: string | null
  inStock: boolean
  availableStock: number
  requiresDelivery: boolean
  requiresInstallation: boolean
  providerName: string | null
}
export interface StoreCartItemResponse {
  id: string
  productId: string
  productNameAr: string
  productNameEn: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  total: number
  availableStock: number
  requiresInstallation: boolean
}
export interface StoreCartResponse {
  id: string
  currency: string
  itemsCount: number
  subtotal: number
  deliveryFee: number
  installationFee: number
  total: number
  items: StoreCartItemResponse[]
}
export interface StoreOrderItemResponse {
  id: string
  productId: string
  productNameAr: string
  productNameEn: string
  quantity: number
  unitPrice: number
  total: number
}
export interface StoreOrderSummaryResponse {
  id: string
  orderNumber: string | null
  status: StoreOrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  currency: string
  itemsCount: number
  subtotal: number
  deliveryFee: number
  installationFee: number
  total: number
  customerName: string | null
  fulfillmentOrderNumber: string | null
  createdAt: string
  checkedOutAt: string | null
  paidAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
}
export interface StoreOrderDetailResponse extends StoreOrderSummaryResponse {
  customerPhone: string | null
  customerNotes: string | null
  address: OrderAddressResponse
  items: StoreOrderItemResponse[]
  fulfillment: StoreFulfillmentResponse | null
}
export interface StoreFulfillmentResponse {
  parentOrderId: string
  orderNumber: string | null
  status: ParentOrderStatus
  paymentStatus: PaymentStatus
  items: StoreFulfillmentItemResponse[]
}
export interface StoreFulfillmentItemResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  executionMode: ExecutionMode
  status: ServiceItemStatus
  providerName: string | null
  executorName: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  completedAt: string | null
}
