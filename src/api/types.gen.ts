// AUTO-GENERATED from Siana.Core/DTOs and Siana.Core/Enums. Regenerate with
// `npm run gen:types` — do not edit by hand.
/* eslint-disable */

export const DayOfWeekValues = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type DayOfWeek = (typeof DayOfWeekValues)[number]
export const AiProviderValues = ['AimlApi', 'Anthropic'] as const
export type AiProvider = (typeof AiProviderValues)[number]
export const AiReviewRatingValues = ['Good', 'Bad'] as const
export type AiReviewRating = (typeof AiReviewRatingValues)[number]
export const AiReviewTagValues = ['None', 'WrongService', 'TooManyQuestions', 'Hallucination', 'WrongPrice', 'Tone', 'Slow', 'ToolProblem', 'Handoff', 'GoodExample', 'Other'] as const
export type AiReviewTag = (typeof AiReviewTagValues)[number]
export const AppExperienceValues = ['Customer', 'Executor', 'Supplier'] as const
export type AppExperience = (typeof AppExperienceValues)[number]
export const AssistantConversationStatusValues = ['Active', 'HandedOff', 'Closed'] as const
export type AssistantConversationStatus = (typeof AssistantConversationStatusValues)[number]
export const AssistantMessageRoleValues = ['Customer', 'Assistant'] as const
export type AssistantMessageRole = (typeof AssistantMessageRoleValues)[number]
export const AssistantCardTypeValues = ['Service', 'Unavailable', 'Addresses', 'Slots', 'Summary', 'Safety', 'Handoff', 'Warranty'] as const
export type AssistantCardType = (typeof AssistantCardTypeValues)[number]
export const AssistantStageValues = ['Started', 'ServiceFound', 'TimeOffered', 'AddedToCart', 'SummaryShown'] as const
export type AssistantStage = (typeof AssistantStageValues)[number]
export const AssistantOutcomeValues = ['Ordered', 'LeftInCart', 'HandedOff', 'AreaNotCovered', 'NoServiceMatched', 'LeftAfterPrice', 'LeftAtTime', 'Failed', 'InProgress'] as const
export type AssistantOutcome = (typeof AssistantOutcomeValues)[number]
export const AvailabilityAlertStatusValues = ['Waiting', 'Notified', 'Cancelled'] as const
export type AvailabilityAlertStatus = (typeof AvailabilityAlertStatusValues)[number]
export const AvailabilityAlertSourceValues = ['App', 'Assistant'] as const
export type AvailabilityAlertSource = (typeof AvailabilityAlertSourceValues)[number]
export const ExecutionModeValues = ['Appliance', 'DirectRepair', 'ScheduledService', 'ProjectService', 'Delivery', 'Workshop'] as const
export type ExecutionMode = (typeof ExecutionModeValues)[number]
export const PricingTypeValues = ['Fixed', 'InspectionThenQuote', 'QuoteRequired'] as const
export type PricingType = (typeof PricingTypeValues)[number]
export const DynamicFieldTypeValues = ['Text', 'Number', 'Select', 'MultiSelect', 'Boolean', 'Date', 'Image'] as const
export type DynamicFieldType = (typeof DynamicFieldTypeValues)[number]
export const PriceItemTypeValues = ['Labor', 'Part', 'AddOn', 'Inspection', 'Discount'] as const
export type PriceItemType = (typeof PriceItemTypeValues)[number]
export const HomeBannerActionTypeValues = ['Category', 'Service', 'Store', 'StoreProduct', 'Assistant', 'Url'] as const
export type HomeBannerActionType = (typeof HomeBannerActionTypeValues)[number]
export const ServiceImageJobStatusValues = ['Pending', 'Generated', 'Approved', 'Rejected', 'Failed'] as const
export type ServiceImageJobStatus = (typeof ServiceImageJobStatusValues)[number]
export const ActiveFilterValues = ['Active', 'Inactive', 'All'] as const
export type ActiveFilter = (typeof ActiveFilterValues)[number]
export const AuditActionValues = ['Create', 'Update', 'Delete', 'Login', 'Logout', 'PasswordChange', 'StatusChange', 'Assign', 'Approve', 'Reject', 'Refund', 'Settle', 'Cancel'] as const
export type AuditAction = (typeof AuditActionValues)[number]
export const NotificationTypeValues = ['Info', 'Success', 'Warning', 'Alert'] as const
export type NotificationType = (typeof NotificationTypeValues)[number]
export const FileCategoryValues = ['Avatar', 'Attachment', 'Document', 'Import', 'Export', 'Evidence', 'ProviderDocument', 'CatalogMedia', 'ProductImage', 'CommunityMedia', 'AssistantMedia', 'SupportAttachment'] as const
export type FileCategory = (typeof FileCategoryValues)[number]
export const ActorTypeValues = ['System', 'Customer', 'Admin', 'Provider', 'Executor'] as const
export type ActorType = (typeof ActorTypeValues)[number]
export const CommunityMemberTypeValues = ['Technician', 'Supplier'] as const
export type CommunityMemberType = (typeof CommunityMemberTypeValues)[number]
export const CommunityMemberStatusValues = ['Active', 'Suspended'] as const
export type CommunityMemberStatus = (typeof CommunityMemberStatusValues)[number]
export const PartConditionValues = ['New', 'Used', 'Refurbished', 'ForParts'] as const
export type PartCondition = (typeof PartConditionValues)[number]
export const PartPriceTypeValues = ['Fixed', 'Negotiable', 'OnContact'] as const
export type PartPriceType = (typeof PartPriceTypeValues)[number]
export const PartListingStatusValues = ['Active', 'Paused', 'SoldOut', 'Removed'] as const
export type PartListingStatus = (typeof PartListingStatusValues)[number]
export const PartRequestStatusValues = ['Open', 'OfferChosen', 'Closed'] as const
export type PartRequestStatus = (typeof PartRequestStatusValues)[number]
export const PartRequestCloseReasonValues = ['Found', 'NoLongerNeeded'] as const
export type PartRequestCloseReason = (typeof PartRequestCloseReasonValues)[number]
export const PartOfferStatusValues = ['Submitted', 'Chosen', 'Withdrawn', 'NotChosen'] as const
export type PartOfferStatus = (typeof PartOfferStatusValues)[number]
export const CommunityPostTypeValues = ['Question', 'Experience', 'Tutorial', 'PartDiscussion', 'PartRequest'] as const
export type CommunityPostType = (typeof CommunityPostTypeValues)[number]
export const CommunityMediaTypeValues = ['Image', 'Video'] as const
export type CommunityMediaType = (typeof CommunityMediaTypeValues)[number]
export const CommunityTargetTypeValues = ['Listing', 'PartRequest', 'Offer', 'Post', 'Comment', 'Member', 'Message'] as const
export type CommunityTargetType = (typeof CommunityTargetTypeValues)[number]
export const ConversationContextValues = ['Listing', 'PartRequest', 'Direct'] as const
export type ConversationContext = (typeof ConversationContextValues)[number]
export const CommunityReportReasonValues = ['Spam', 'Fake', 'Inappropriate', 'Fraud', 'Other'] as const
export type CommunityReportReason = (typeof CommunityReportReasonValues)[number]
export const CommunityReportStatusValues = ['Open', 'Dismissed', 'ActionTaken'] as const
export type CommunityReportStatus = (typeof CommunityReportStatusValues)[number]
export const CommunityReportActionValues = ['Dismiss', 'HideContent', 'SuspendMember'] as const
export type CommunityReportAction = (typeof CommunityReportActionValues)[number]
export const CommunitySavedTypeValues = ['Listing', 'PartRequest', 'Post'] as const
export type CommunitySavedType = (typeof CommunitySavedTypeValues)[number]
export const CommunityListingSortValues = ['Newest', 'PriceLowToHigh', 'PriceHighToLow'] as const
export type CommunityListingSort = (typeof CommunityListingSortValues)[number]
export const CommunityPostFilterValues = ['Unanswered', 'Popular', 'Videos'] as const
export type CommunityPostFilter = (typeof CommunityPostFilterValues)[number]
export const QuotationStatusValues = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired', 'Cancelled'] as const
export type QuotationStatus = (typeof QuotationStatusValues)[number]
export const EvidenceStageValues = ['CustomerRequest', 'Before', 'During', 'After', 'Custody', 'Handover'] as const
export type EvidenceStage = (typeof EvidenceStageValues)[number]
export const EvidenceTypeValues = ['Image', 'Video', 'Document'] as const
export type EvidenceType = (typeof EvidenceTypeValues)[number]
export const ExecutionStepValues = ['Inspection', 'Diagnosis', 'Quotation', 'CustomerApproval', 'Repair', 'Testing', 'Documentation', 'Completion', 'Assessment', 'IdentifyIssue', 'Execution', 'ScopeReview', 'PreService', 'CustomerConfirmation', 'Survey', 'Measurements', 'Scheduling', 'Progress', 'Handover', 'Pickup', 'CustodyDocumentation', 'Transport', 'Delivery', 'Verification', 'DeviceIntake', 'Return'] as const
export type ExecutionStep = (typeof ExecutionStepValues)[number]
export const DeviceCustodyStageValues = ['AtCustomer', 'PickedUp', 'AtWorkshop', 'ReadyForReturn', 'OutForReturn', 'Returned'] as const
export type DeviceCustodyStage = (typeof DeviceCustodyStageValues)[number]
export const ProgressUpdateKindValues = ['InspectionStarted', 'DiagnosisDone', 'WaitingForParts', 'PartsArrived', 'RepairInProgress', 'Testing', 'ReadyForReturn', 'Delayed', 'Other'] as const
export type ProgressUpdateKind = (typeof ProgressUpdateKindValues)[number]
export const ServiceItemLegTypeValues = ['Pickup', 'Return'] as const
export type ServiceItemLegType = (typeof ServiceItemLegTypeValues)[number]
export const ServiceItemLegStatusValues = ['Planned', 'Done', 'Cancelled'] as const
export type ServiceItemLegStatus = (typeof ServiceItemLegStatusValues)[number]
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
export const OtpPurposeValues = ['CustomerLogin', 'ProviderLogin', 'ProviderRegistration', 'AppLogin', 'ChangePhone'] as const
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
export const ProviderWithdrawalStateValues = ['Open', 'Cancelled', 'Rejected'] as const
export type ProviderWithdrawalState = (typeof ProviderWithdrawalStateValues)[number]
export const ProviderWithdrawalStatusValues = ['Requested', 'Approved', 'Paid', 'OnHold', 'Cancelled', 'Rejected'] as const
export type ProviderWithdrawalStatus = (typeof ProviderWithdrawalStatusValues)[number]
export const ConversationSideValues = ['Customer', 'Provider', 'Executor'] as const
export type ConversationSide = (typeof ConversationSideValues)[number]
export const ExecutorTimeOffReasonValues = ['Leave', 'Sick', 'Training', 'Other'] as const
export type ExecutorTimeOffReason = (typeof ExecutorTimeOffReasonValues)[number]
export const PushPlatformValues = ['Android', 'Ios', 'Web'] as const
export type PushPlatform = (typeof PushPlatformValues)[number]
export const PushAppValues = ['Customer', 'Executor', 'Provider', 'Dashboard'] as const
export type PushApp = (typeof PushAppValues)[number]
export const NotificationPushStatusValues = ['Skipped', 'Pending', 'Sent', 'NoDevice', 'Failed'] as const
export type NotificationPushStatus = (typeof NotificationPushStatusValues)[number]
export const DisputeStatusValues = ['Open', 'UnderReview', 'Resolved', 'Rejected', 'Escalated'] as const
export type DisputeStatus = (typeof DisputeStatusValues)[number]
export const DisputeResolutionTypeValues = ['None', 'FullRefund', 'PartialRefund', 'Rework', 'NoAction'] as const
export type DisputeResolutionType = (typeof DisputeResolutionTypeValues)[number]
export const RoleValues = ['SuperAdmin', 'TenantAdmin', 'Manager', 'Member', 'PlatformAdmin', 'Customer', 'ProviderOwner', 'ProviderSupervisor', 'Executor', 'Supplier'] as const
export type Role = (typeof RoleValues)[number]
export const StoreOrderStatusValues = ['Draft', 'PendingPayment', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const
export type StoreOrderStatus = (typeof StoreOrderStatusValues)[number]
export const StoreProductImageStatusValues = ['Pending', 'Ready', 'Failed'] as const
export type StoreProductImageStatus = (typeof StoreProductImageStatusValues)[number]
export const StoreOptionKindValues = ['Color', 'Size', 'Other'] as const
export type StoreOptionKind = (typeof StoreOptionKindValues)[number]
export const StoreProductSortValues = ['Recommended', 'BestSelling', 'PriceLowToHigh', 'PriceHighToLow', 'Newest'] as const
export type StoreProductSort = (typeof StoreProductSortValues)[number]
export const SupportTicketKindValues = ['CustomerReport', 'TechnicianComplaint', 'DashboardTicket'] as const
export type SupportTicketKind = (typeof SupportTicketKindValues)[number]
export const SupportChannelValues = ['CustomerApp', 'ExecutorApp', 'ProviderPlatform', 'AdminDashboard'] as const
export type SupportChannel = (typeof SupportChannelValues)[number]
export const SupportTicketCategoryValues = ['AppTechnical', 'ServiceProblem', 'Communication', 'Payment', 'Account', 'Bug', 'Access', 'Data', 'FeatureRequest', 'Other'] as const
export type SupportTicketCategory = (typeof SupportTicketCategoryValues)[number]
export const SupportTicketPriorityValues = ['Low', 'Normal', 'High', 'Urgent'] as const
export type SupportTicketPriority = (typeof SupportTicketPriorityValues)[number]
export const SupportTicketStatusValues = ['New', 'UnderReview', 'Open', 'InProgress', 'WaitingForReply', 'Resolved', 'Closed'] as const
export type SupportTicketStatus = (typeof SupportTicketStatusValues)[number]
export const SupportMessageSideValues = ['Requester', 'Staff'] as const
export type SupportMessageSide = (typeof SupportMessageSideValues)[number]
export const SupportTicketEventTypeValues = ['Created', 'StatusChanged', 'Assigned', 'PriorityChanged', 'RequesterReplied', 'StaffReplied', 'InternalNote'] as const
export type SupportTicketEventType = (typeof SupportTicketEventTypeValues)[number]
export const UserStatusValues = ['PendingApproval', 'Active', 'Suspended'] as const
export type UserStatus = (typeof UserStatusValues)[number]
export const WalletItemsBucketValues = ['Available', 'OnHold'] as const
export type WalletItemsBucket = (typeof WalletItemsBucketValues)[number]

// ── Ai/AiDtos.cs
export interface AiSettingsResponse {
  provider: AiProvider
  model: string
  hasApiKey: boolean
  apiKeyMasked: string | null
  baseUrl: string | null
  effectiveBaseUrl: string
  thinking: boolean
  maxTokens: number
  enabled: boolean
  inputPricePerMTok: number
  outputPricePerMTok: number
  cacheReadPricePerMTok: number
  cacheWritePricePerMTok: number
  imageModel: string
  imagePricePerImage: number
  promptVersion: string
  fromConfiguration: boolean
  apiKeyUnreadable: boolean
  mode: string
  updatedAt: string | null
  updatedBy: string | null
}
export interface UpdateAiSettingsRequest {
  provider: AiProvider
  model: string
  apiKey?: string | null
  clearApiKey: boolean
  baseUrl?: string | null
  thinking: boolean
  maxTokens: number
  enabled: boolean
  inputPricePerMTok: number
  outputPricePerMTok: number
  cacheReadPricePerMTok: number
  cacheWritePricePerMTok: number
  imageModel?: string | null
  imagePricePerImage?: number | null
}
export interface TestAiSettingsRequest {
  provider?: AiProvider | null
  model?: string | null
  apiKey?: string | null
  baseUrl?: string | null
}
export interface AiConnectionTestResponse {
  ok: boolean
  model: string
  latencyMs: number
  reply: string | null
  error: string | null
}
export interface AiModelOption {
  provider: AiProvider
  model: string
  label: string
  recommended: boolean
  inputPricePerMTok: number
  outputPricePerMTok: number
  cacheReadPricePerMTok: number
  cacheWritePricePerMTok: number
  note: string | null
}
export interface AiUsageRequest {
  from?: string | null
  to?: string | null
}
export interface AiUsageTotals {
  calls: number
  failedCalls: number
  conversations: number
  customers: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  averageLatencyMs: number
}
export interface AiUsageOverviewResponse {
  from: string
  to: string
  totals: AiUsageTotals
  orders: number
  costPerOrderUsd: number
  days: AiUsageDay[]
  models: AiUsageByModel[]
}
export interface AiUsageDay {
  date: string
  calls: number
  conversations: number
  tokens: number
  costUsd: number
}
export interface AiUsageByModel {
  provider: AiProvider
  model: string
  calls: number
  tokens: number
  costUsd: number
  averageLatencyMs: number
}
export interface AiUserUsageListRequest extends PaginatedRequest {
  from?: string | null
  to?: string | null
  search?: string | null
}
export interface AiUserUsageResponse {
  userId: string
  name: string | null
  phone: string | null
  conversations: number
  customerMessages: number
  calls: number
  tokens: number
  costUsd: number
  orders: number
  lastUsedAt: string | null
}
export interface AiUserUsageDetailResponse {
  summary: AiUserUsageResponse
  days: AiUsageDay[]
  conversations: AdminAssistantConversationResponse[]
}
export interface AiCallListRequest extends PaginatedRequest {
  from?: string | null
  to?: string | null
  model?: string | null
  promptVersion?: string | null
  feature?: string | null
  failed?: boolean | null
  tool?: string | null
  toolErrors?: boolean | null
}
export interface AiCallResponse {
  id: string
  feature: string
  conversationId: string | null
  serviceItemId: string | null
  userId: string
  customerName: string | null
  provider: AiProvider
  model: string
  promptVersion: string
  round: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  latencyMs: number
  stopReason: string
  error: string | null
  tools: AiToolCallResponse[]
  createdAt: string
}
export interface AiToolCallResponse {
  id: string
  toolName: string
  inputJson: string
  resultJson: string
  isError: boolean
  durationMs: number
}
export interface AiTraceResponse {
  conversation: AdminAssistantConversationResponse
  steps: AiTraceStep[]
  review: AiReviewResponse | null
}
export interface AiTraceStep {
  sequence: number
  kind: string
  text: string | null
  cardType: AssistantCardType | null
  quickReplies: string[]
  requestPhoto: boolean
  photos: number
  blocksJson: string | null
  call: AiCallResponse | null
  createdAt: string
}
export interface AiToolStatsResponse {
  from: string
  to: string
  tools: AiToolStat[]
}
export interface AiToolStat {
  toolName: string
  calls: number
  errors: number
  errorRate: number
  averageDurationMs: number
  maxDurationMs: number
}
export interface AiVersionComparisonResponse {
  from: string
  to: string
  versions: AiVersionStat[]
}
export interface AiVersionStat {
  model: string | null
  promptVersion: string | null
  firstSeen: string
  lastSeen: string
  conversations: number
  ordered: number
  conversionRate: number
  averageCustomerMessages: number
  averageCostUsd: number
  failures: number
  reviewedGood: number
  reviewedBad: number
}
export interface SaveAiReviewRequest {
  rating: AiReviewRating
  tags: AiReviewTag
  note?: string | null
  expectedBehavior?: string | null
}
export interface AiReviewResponse {
  conversationId: string
  rating: AiReviewRating
  tags: AiReviewTag
  tagList: AiReviewTag[]
  note: string | null
  expectedBehavior: string | null
  reviewedBy: string | null
  reviewedAt: string
}
export interface AiReviewListRequest extends PaginatedRequest {
  rating?: AiReviewRating | null
  tag?: AiReviewTag | null
  from?: string | null
  to?: string | null
}
export interface AiReviewListItem {
  review: AiReviewResponse
  title: string | null
  model: string | null
  promptVersion: string | null
  outcome: AssistantOutcome
}
export interface AiExportRequest {
  from?: string | null
  to?: string | null
  rating?: AiReviewRating | null
  limit: number
}
export interface AiExportResponse {
  generatedAt: string
  promptVersion: string
  conversations: AiExportConversation[]
}
export interface AiExportConversation {
  id: string
  model: string | null
  promptVersion: string | null
  outcome: AssistantOutcome
  review: AiReviewResponse | null
  turns: AiExportTurn[]
  tools: AiToolCallResponse[]
}
export interface AiExportTurn {
  role: AssistantMessageRole
  text: string
  card: AssistantCardType | null
  quickReplies: string[]
  photos: number
}

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
  canRepair: boolean
  canDeliver: boolean
  isOffDuty: boolean
  offDutyReason: string | null
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

// ── Assistant/AssistantDtos.cs
export interface StartAssistantConversationRequest {
  addressId?: string | null
  context?: AssistantPageContext | null
}
export interface AssistantPageContext {
  page: string
  canonicalServiceId: string | null
  cartItemId: string | null
  categoryId: string | null
  subcategoryId: string | null
  orderId: string | null
  serviceItemId: string | null
  draft: AssistantFormDraft | null
  from: string | null
  searchQuery: string | null
}
export interface AssistantFormDraft {
  issueId: string | null
  description: string | null
  fieldValues: Record<string, unknown> | null
  missingRequired: string[] | null
  deviceCount: number | null
}
export interface SendAssistantMessageRequest {
  text: string
  mediaIds: string[]
}
export interface AssistantConversationListRequest extends PaginatedRequest {
}
export interface AssistantConversationResponse {
  id: string
  status: AssistantConversationStatus
  title: string | null
  addressId: string | null
  contextPage: string | null
  contextServiceId: string | null
  contextCategoryId: string | null
  contextSubcategoryId: string | null
  contextOrderId: string | null
  contextServiceItemId: string | null
  canSend: boolean
  messages: AssistantMessageResponse[]
  createdAt: string
  lastMessageAt: string
}
export interface AssistantConversationSummaryResponse {
  id: string
  status: AssistantConversationStatus
  title: string | null
  lastMessagePreview: string | null
  cartItemsAdded: number
  createdAt: string
  lastMessageAt: string
}
export interface AssistantMessageResponse {
  id: string
  role: AssistantMessageRole
  text: string
  quickReplies: string[]
  card: AssistantCardResponse | null
  requestPhoto: boolean
  media: AssistantMediaResponse[]
  createdAt: string
}
export interface AssistantMediaResponse {
  id: string
  url: string
  contentType: string
  sizeBytes: number
}
export interface AssistantTurnResponse {
  conversationId: string
  status: AssistantConversationStatus
  canSend: boolean
  customerMessage: AssistantMessageResponse
  reply: AssistantMessageResponse
}
export interface AssistantCardResponse {
  type: AssistantCardType
  service: AssistantServiceCard | null
  unavailable: AssistantUnavailableCard | null
  addresses: AssistantAddressOption[] | null
  slots: AssistantSlotOption[] | null
  summary: AssistantSummaryCard | null
  warranty: AssistantWarrantyCard | null
}
export interface AssistantWarrantyCard {
  warrantyId: string
  warrantyNumber: string
  orderId: string
  serviceItemId: string
  serviceNameAr: string
  serviceNameEn: string
  serviceDate: string
  endsAt: string
}
export interface AssistantServiceCard {
  serviceId: string
  nameAr: string
  nameEn: string
  imageUrl: string | null
  pricingType: PricingType
  basePrice: number | null
  priceUnitAr: string | null
  priceUnitEn: string | null
  currency: string
  estimatedDurationMinutes: number | null
  warrantyDays: number | null
  isAvailable: boolean
  address: AssistantAddressOption | null
  prefill: AssistantServicePrefill | null
}
export interface AssistantServicePrefill {
  description: string | null
  issueId: string | null
  fieldValues: Record<string, unknown>
  mediaIds: string[]
}
export interface AssistantUnavailableCard {
  serviceId: string
  nameAr: string
  nameEn: string
  address: AssistantAddressOption | null
  availableAt: AssistantAddressOption[]
}
export interface AssistantAddressOption {
  id: string
  label: string
  city: string
  district: string | null
  isDefault: boolean
}
export interface AssistantSlotOption {
  label: string
  start: string
  end: string
}
export interface AssistantSummaryCard {
  items: AssistantSummaryLine[]
  currency: string
  total: number
  hasPriceOnQuoteItems: boolean
  address: AssistantAddressOption | null
  slot: AssistantSlotOption | null
  paymentMethods: PaymentMethod[]
  checkout: AssistantCheckoutPayload
}
export interface AssistantSummaryLine {
  cartItemId: string
  serviceNameAr: string
  serviceNameEn: string
  baseAmount: number
  priceOnQuote: boolean
  deviceCount: number
}
export interface AssistantCheckoutPayload {
  addressId: string | null
  preferredStart: string | null
  preferredEnd: string | null
  customerNotes: string | null
}
export interface AdminAssistantConversationListRequest extends PaginatedRequest {
  status?: AssistantConversationStatus | null
  outcome?: AssistantOutcome | null
  userId?: string | null
  from?: string | null
  to?: string | null
  search?: string | null
}
export interface AdminAssistantConversationResponse {
  id: string
  userId: string
  customerName: string | null
  customerPhone: string | null
  status: AssistantConversationStatus
  title: string | null
  handoffReason: string | null
  outcome: AssistantOutcome
  furthestStage: AssistantStage
  failures: number
  model: string | null
  promptVersion: string | null
  costUsd: number
  customerMessagesCount: number
  cartItemsAdded: number
  modelCalls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  createdAt: string
  lastMessageAt: string
  messages: AssistantMessageResponse[] | null
}
export interface AssistantFunnelRequest {
  from?: string | null
  to?: string | null
}
export interface AssistantFunnelResponse {
  from: string
  to: string
  conversations: number
  ordered: number
  conversionRate: number
  averageCustomerMessages: number
  stages: AssistantFunnelStage[]
  outcomes: AssistantFunnelOutcome[]
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}
export interface AssistantFunnelStage {
  stage: AssistantStage | null
  reached: number
}
export interface AssistantFunnelOutcome {
  outcome: AssistantOutcome
  count: number
}

// ── Auth/AppAuthDtos.cs
export interface AppVerifyOtpRequest {
  phoneNumber: string
  code: string
  deviceId?: string | null
  preferredCulture?: string | null
}
export interface AppSwitchRequest {
  experience: AppExperience
  deviceId?: string | null
}
export interface AppAuthResponse extends AuthResponse {
  experience: AppExperience
  availableExperiences: AppExperience[]
  hasProviderManagementAccount: boolean
}
export interface AppExperiencesResponse {
  current: AppExperience
  availableExperiences: AppExperience[]
  hasProviderManagementAccount: boolean
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
export interface SetServiceCustomerInfoRequest {
  estimatedMinPrice?: number | null
  estimatedMaxPrice?: number | null
  includesAr?: string[] | null
  includesEn?: string[] | null
  excludesAr?: string[] | null
  excludesEn?: string[] | null
}
export interface SetSubcategoryCustomerInfoRequest {
  descriptionAr?: string | null
  descriptionEn?: string | null
}
export interface SetServiceUnitPricingRequest {
  quantityFieldKey?: string | null
  unitAr?: string | null
  unitEn?: string | null
}
export interface GenerateServiceImageRequest {
  notes?: string | null
}
export interface ServiceImageJobsRequest extends PaginatedRequest {
  status?: ServiceImageJobStatus | null
  canonicalServiceId?: string | null
  subcategoryId?: string | null
  targetType?: string | null
}
export interface ServiceImageJobResponse {
  id: string
  targetType: string
  canonicalServiceId: string | null
  subcategoryId: string | null
  serviceCode: string
  serviceNameAr: string
  serviceNameEn: string
  currentImageUrl: string | null
  status: ServiceImageJobStatus
  prompt: string
  provider: string
  resultUrl: string | null
  error: string | null
  costUsd: number
  requestedByName: string | null
  reviewedByName: string | null
  createdAt: string
  generatedAt: string | null
  reviewedAt: string | null
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
  helpAr?: string | null
  helpEn?: string | null
  fieldType: DynamicFieldType
  isRequired: boolean
  optionsJson?: string | null
  sortOrder: number
}
export interface UpdateDynamicFieldRequest {
  labelAr: string
  labelEn: string
  helpAr?: string | null
  helpEn?: string | null
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
  descriptionAr: string | null
  descriptionEn: string | null
  imageUrl: string | null
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
  estimatedMinPrice: number | null
  estimatedMaxPrice: number | null
  priceQuantityFieldKey: string | null
  priceUnitAr: string | null
  priceUnitEn: string | null
  includesAr: string[]
  includesEn: string[]
  excludesAr: string[]
  excludesEn: string[]
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
  helpAr: string | null
  helpEn: string | null
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
export interface CreateSymptomRequest {
  code: string
  nameAr: string
  nameEn: string
  canonicalServiceId: string
  serviceIssueId?: string | null
  sortOrder: number
}
export interface UpdateSymptomRequest {
  nameAr: string
  nameEn: string
  canonicalServiceId: string
  serviceIssueId?: string | null
  sortOrder: number
}
export interface SymptomResponse {
  id: string
  subcategoryId: string
  code: string
  nameAr: string
  nameEn: string
  canonicalServiceId: string
  serviceCode: string
  serviceNameAr: string
  serviceNameEn: string
  serviceIssueId: string | null
  issueNameAr: string | null
  issueNameEn: string | null
  sortOrder: number
  isActive: boolean
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
  descriptionAr: string | null
  descriptionEn: string | null
  imageUrl: string | null
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
  priceQuantityFieldKey: string | null
  priceUnitAr: string | null
  priceUnitEn: string | null
  requiresDevice: boolean
  supportsMultiDevice: boolean
  estimatedDurationMinutes: number | null
  warrantyDays: number | null
  sortOrder: number
  estimatedMinPrice: number | null
  estimatedMaxPrice: number | null
}
export interface DynamicFieldResponse {
  id: string
  key: string
  labelAr: string
  labelEn: string
  helpAr: string | null
  helpEn: string | null
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
  includesAr: string[]
  includesEn: string[]
  excludesAr: string[]
  excludesEn: string[]
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
  descriptionAr: string | null
  descriptionEn: string | null
  imageUrl: string | null
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

// ── Catalog/DiscoveryDtos.cs
export interface PopularServicesRequest {
  count: number
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  district?: string | null
}
export interface PopularServiceResponse extends ServiceCardResponse {
  rank: number
  ordersCount: number
  averageRating: number | null
  ratingsCount: number
  isAvailable: boolean | null
}
export interface ServiceUnderstandRequest {
  q: string
  latitude?: number | null
  longitude?: number | null
}
export interface ServiceUnderstandResponse {
  analyzer: string
  problems: ProblemMatch[]
  alternatives: ServiceCardResponse[]
}
export interface ProblemMatch {
  text: string
  matches: SmartRequestMatch[]
}
export interface HomeBannerResponse {
  id: string
  titleAr: string
  titleEn: string
  subtitleAr: string | null
  subtitleEn: string | null
  imageUrl: string | null
  actionLabelAr: string
  actionLabelEn: string
  actionType: HomeBannerActionType
  actionTargetId: string | null
  actionUrl: string | null
  sortOrder: number
  startsAt: string | null
  endsAt: string | null
}
export interface HomeBannerAdminResponse extends HomeBannerResponse {
  isActive: boolean
  isLive: boolean
  actionTargetNameAr: string | null
  createdAt: string
  updatedAt: string | null
}
export interface SaveHomeBannerRequest {
  titleAr: string
  titleEn: string
  subtitleAr?: string | null
  subtitleEn?: string | null
  actionLabelAr: string
  actionLabelEn: string
  actionType: HomeBannerActionType
  actionTargetId?: string | null
  actionUrl?: string | null
  sortOrder: number
  startsAt?: string | null
  endsAt?: string | null
  isActive: boolean
}
export interface SyncFavoriteServicesRequest {
  serviceIds: string[]
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

// ── Community/CommunityAdminDtos.cs
export interface AdminCommunityMemberListRequest extends PaginatedRequest {
  search?: string | null
  type?: CommunityMemberType | null
  status?: CommunityMemberStatus | null
  verified?: boolean | null
}
export interface SetCommunityMemberStatusRequest {
  status: CommunityMemberStatus
  reason?: string | null
}
export interface SetCommunityMemberVerifiedRequest {
  isVerified: boolean
}
export interface SaveSupplierRequest {
  fullName: string
  phone: string
  businessName: string
  city: string
  bio?: string | null
  specialtyIds: string[]
  isVerified: boolean
}
export interface SaveCommunitySpecialtyRequest {
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
}
export interface AdminCommunityContentListRequest extends PaginatedRequest {
  search?: string | null
  memberId?: string | null
  hidden?: boolean | null
}
export interface SetCommunityVisibilityRequest {
  isHidden: boolean
  reason?: string | null
}
export interface AdminCommunityReportListRequest extends PaginatedRequest {
  status?: CommunityReportStatus | null
  targetType?: CommunityTargetType | null
}
export interface ResolveCommunityReportRequest {
  action: CommunityReportAction
  note?: string | null
}
export interface CommunityOverviewResponse {
  membersCount: number
  techniciansCount: number
  suppliersCount: number
  suspendedCount: number
  activeListings: number
  openRequests: number
  offersLast7Days: number
  postsLast7Days: number
  openReports: number
}
export interface AdminCommunityMemberResponse {
  id: string
  userId: string
  type: CommunityMemberType
  displayName: string
  businessName: string | null
  phone: string | null
  city: string | null
  avatarUrl: string | null
  isVerified: boolean
  status: CommunityMemberStatus
  suspensionReason: string | null
  accountActive: boolean
  organizationName: string | null
  specialties: CommunitySpecialtyResponse[]
  listingsCount: number
  requestsCount: number
  postsCount: number
  openReportsAgainst: number
  joinedAt: string
}
export interface AdminCommunityReportResponse {
  id: string
  targetType: CommunityTargetType
  targetId: string
  targetPreview: string | null
  targetHidden: boolean
  targetMember: CommunityMemberSummaryResponse | null
  reporter: CommunityMemberSummaryResponse
  reason: CommunityReportReason
  details: string | null
  status: CommunityReportStatus
  action: CommunityReportAction | null
  reviewNote: string | null
  reviewedAt: string | null
  otherOpenReports: number
  createdAt: string
}

// ── Community/CommunityDtos.cs
export interface UpdateCommunityProfileRequest {
  displayName: string
  bio?: string | null
  city?: string | null
  businessName?: string | null
  specialtyIds: string[]
}
export interface ListingListRequest extends PaginatedRequest {
  search?: string | null
  specialtyId?: string | null
  condition?: PartCondition | null
  priceType?: PartPriceType | null
  city?: string | null
  sellerId?: string | null
  includeUnavailable?: boolean
  sort?: CommunityListingSort
}
export interface MyListingsRequest extends PaginatedRequest {
  status?: PartListingStatus | null
}
export interface SaveListingRequest {
  specialtyId: string
  title: string
  partNumber?: string | null
  compatibleModels?: string | null
  description?: string | null
  condition: PartCondition
  quantity: number
  priceType: PartPriceType
  price?: number | null
  city: string
  district?: string | null
  deliveryAvailable: boolean
  mediaIds: string[]
}
export interface SetListingStatusRequest {
  status: PartListingStatus
}
export interface PartRequestListRequest extends PaginatedRequest {
  search?: string | null
  specialtyId?: string | null
  city?: string | null
  status?: PartRequestStatus | null
}
export interface MyPartRequestsRequest extends PaginatedRequest {
  status?: PartRequestStatus | null
}
export interface SavePartRequestRequest {
  specialtyId: string
  title: string
  partNumber?: string | null
  deviceModel?: string | null
  description?: string | null
  quantity: number
  city: string
  mediaIds: string[]
}
export interface ClosePartRequestRequest {
  reason: PartRequestCloseReason
}
export interface SavePartOfferRequest {
  listingId?: string | null
  partName?: string | null
  condition: PartCondition
  quantity: number
  priceType: PartPriceType
  price?: number | null
  availableInDays: number
  note?: string | null
  mediaIds: string[]
}
export interface MyOffersRequest extends PaginatedRequest {
  status?: PartOfferStatus | null
}
export interface PostListRequest extends PaginatedRequest {
  search?: string | null
  type?: CommunityPostType | null
  specialtyId?: string | null
  authorId?: string | null
  filter?: CommunityPostFilter | null
}
export interface SavePostRequest {
  type: CommunityPostType
  specialtyId?: string | null
  title?: string | null
  body: string
  linkedListingId?: string | null
  linkedRequestId?: string | null
  mediaIds: string[]
}
export interface CommentListRequest extends PaginatedRequest {
  parentCommentId?: string | null
}
export interface CreateCommentRequest {
  body: string
  parentCommentId?: string | null
  mediaIds: string[]
}
export interface AcceptAnswerRequest {
  commentId?: string | null
}
export interface SaveItemRequest {
  itemType: CommunitySavedType
  itemId: string
}
export interface OpenConversationRequest {
  context: ConversationContext
  listingId?: string | null
  requestId?: string | null
  offerId?: string | null
  memberId?: string | null
}
export interface MessageListRequest {
  before?: string | null
  take?: number
}
export interface SendMessageRequest {
  body?: string | null
  mediaId?: string | null
}
export interface CreateCommunityReportRequest {
  targetType: CommunityTargetType
  targetId: string
  reason: CommunityReportReason
  details?: string | null
}
export interface CommunitySearchRequest {
  q: string
}
export interface CommunitySpecialtyResponse {
  id: string
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
  isActive: boolean
}
export interface CommunityMediaResponse {
  id: string
  type: CommunityMediaType
  url: string
  contentType: string
  sizeBytes: number
}
export interface CommunityMemberSummaryResponse {
  id: string
  type: CommunityMemberType
  displayName: string
  businessName: string | null
  avatarUrl: string | null
  city: string | null
  isVerified: boolean
}
export interface CommunityProfileResponse extends CommunityMemberSummaryResponse {
  bio: string | null
  status: CommunityMemberStatus
  suspensionReason: string | null
  specialties: CommunitySpecialtyResponse[]
  listingsCount: number
  postsCount: number
  unreadMessages: number
  joinedAt: string
}
export interface CommunityMemberProfileResponse extends CommunityMemberSummaryResponse {
  bio: string | null
  specialties: CommunitySpecialtyResponse[]
  listingsCount: number
  postsCount: number
  joinedAt: string
  isSuspended: boolean
  isBlockedByMe: boolean
  canMessage: boolean
}
export interface ListingSummaryResponse {
  id: string
  title: string
  specialty: LookupResponse
  condition: PartCondition
  quantity: number
  priceType: PartPriceType
  price: number | null
  currency: string
  city: string
  status: PartListingStatus
  isAvailable: boolean
  coverUrl: string | null
  hasVideo: boolean
  seller: CommunityMemberSummaryResponse
  isSaved: boolean
  isMine: boolean
  isHidden: boolean
  hiddenReason: string | null
  createdAt: string
}
export interface ListingDetailResponse extends ListingSummaryResponse {
  partNumber: string | null
  compatibleModels: string | null
  description: string | null
  district: string | null
  deliveryAvailable: boolean
  media: CommunityMediaResponse[]
  viewsCount: number
  savesCount: number
  updatedAt: string | null
}
export interface PartRequestSummaryResponse {
  id: string
  title: string
  specialty: LookupResponse
  quantity: number
  city: string
  status: PartRequestStatus
  offersCount: number
  coverUrl: string | null
  requester: CommunityMemberSummaryResponse
  isMine: boolean
  isSaved: boolean
  myOfferStatus: PartOfferStatus | null
  isHidden: boolean
  hiddenReason: string | null
  createdAt: string
}
export interface PartRequestDetailResponse extends PartRequestSummaryResponse {
  partNumber: string | null
  deviceModel: string | null
  description: string | null
  media: CommunityMediaResponse[]
  chosenOfferId: string | null
  closeReason: PartRequestCloseReason | null
  closedAt: string | null
  offers: PartOfferResponse[]
}
export interface PartOfferResponse {
  id: string
  requestId: string
  requestTitle: string
  seller: CommunityMemberSummaryResponse
  listingId: string | null
  partName: string | null
  condition: PartCondition
  quantity: number
  priceType: PartPriceType
  price: number | null
  currency: string
  availableInDays: number
  note: string | null
  status: PartOfferStatus
  media: CommunityMediaResponse[]
  isMine: boolean
  conversationId: string | null
  createdAt: string
  updatedAt: string | null
}
export interface CommunityPostResponse {
  id: string
  type: CommunityPostType
  specialty: LookupResponse | null
  title: string | null
  body: string
  author: CommunityMemberSummaryResponse
  media: CommunityMediaResponse[]
  linkedListing: ListingSummaryResponse | null
  linkedRequest: PartRequestSummaryResponse | null
  acceptedCommentId: string | null
  likesCount: number
  commentsCount: number
  hasVideo: boolean
  isLiked: boolean
  isSaved: boolean
  isMine: boolean
  isHidden: boolean
  hiddenReason: string | null
  createdAt: string
  updatedAt: string | null
}
export interface CommunityCommentResponse {
  id: string
  postId: string
  parentCommentId: string | null
  author: CommunityMemberSummaryResponse
  body: string
  media: CommunityMediaResponse[]
  repliesCount: number
  isAccepted: boolean
  isMine: boolean
  isHidden: boolean
  createdAt: string
}
export interface CommunityConversationResponse {
  id: string
  context: ConversationContext
  listing: ListingSummaryResponse | null
  request: PartRequestSummaryResponse | null
  offerId: string | null
  otherMember: CommunityMemberSummaryResponse
  lastMessagePreview: string | null
  lastMessageAt: string
  unreadCount: number
  isBlocked: boolean
}
export interface CommunityMessageResponse {
  id: string
  conversationId: string
  senderId: string
  isMine: boolean
  body: string | null
  media: CommunityMediaResponse | null
  isHidden: boolean
  createdAt: string
}
export interface CommunityHomeResponse {
  openRequestsCount: number
  newListingsCount: number
  unreadMessages: number
  requestsNeedingParts: PartRequestSummaryResponse[]
  suggestedListings: ListingSummaryResponse[]
  trendingPosts: CommunityPostResponse[]
}
export interface CommunitySearchResponse {
  listings: ListingSummaryResponse[]
  requests: PartRequestSummaryResponse[]
  posts: CommunityPostResponse[]
  members: CommunityMemberSummaryResponse[]
}
export interface CommunityReportResponse {
  id: string
  targetType: CommunityTargetType
  targetId: string
  reason: CommunityReportReason
  status: CommunityReportStatus
  createdAt: string
}

// ── Customers/AvailabilityAlertDtos.cs
export interface CreateAvailabilityAlertRequest {
  canonicalServiceId: string
  addressId?: string | null
}
export interface AvailabilityAlertListRequest extends PaginatedRequest {
  status?: AvailabilityAlertStatus | null
}
export interface AvailabilityAlertResponse {
  id: string
  canonicalServiceId: string
  serviceNameAr: string
  serviceNameEn: string
  addressId: string
  addressLabel: string | null
  city: string
  district: string | null
  status: AvailabilityAlertStatus
  source: AvailabilityAlertSource
  createdAt: string
  notifiedAt: string | null
}
export interface AvailabilityDemandRequest {
  city?: string | null
  from?: string | null
}
export interface AvailabilityDemandResponse {
  waitingAlerts: number
  customers: number
  notifiedAlerts: number
  rows: AvailabilityDemandRow[]
  districts: AvailabilityDemandDistrict[]
}
export interface AvailabilityDemandRow {
  city: string
  district: string | null
  canonicalServiceId: string
  serviceNameAr: string
  serviceNameEn: string
  waiting: number
  oldestAt: string
  newestAt: string
  latitude: number | null
  longitude: number | null
}
export interface AvailabilityDemandDistrict {
  city: string
  district: string | null
  waiting: number
  services: number
  latitude: number | null
  longitude: number | null
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
  avatarUrl: string | null
  canChangePhone: boolean
  createdAt: string
}
export interface ConfirmPhoneChangeRequest {
  phoneNumber: string
  code: string
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
  assistantMediaIds?: string[] | null
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
  unitPrice: number | null
  pricedQuantity: number | null
  priceUnitAr: string | null
  priceUnitEn: string | null
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
  unitPrice: number | null
  pricedQuantity: number | null
  priceOnQuote: boolean
  deviceCount: number
}

// ── Customers/CustomerInvoiceDtos.cs
export interface InvoiceResponse {
  invoiceNumber: string
  orderId: string
  orderNumber: string | null
  issuedAt: string
  currency: string
  isTaxInvoice: boolean
  noticeAr: string
  noticeEn: string
  customerName: string
  address: OrderAddressResponse
  lines: InvoiceLineResponse[]
  subtotal: number
  discountTotal: number
  total: number
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus
  paidAt: string | null
  paidAmount: number
  refundedAmount: number
  amountDue: number
}
export interface InvoiceLineResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  providerNameAr: string | null
  providerNameEn: string | null
  status: ServiceItemStatus
  pricingType: PricingType
  inspectionFee: number | null
  quotedAmount: number | null
  amount: number
  refundedAmount: number
  isBilled: boolean
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
  serviceId: string | null
  serviceCode: string | null
  serviceImageUrl: string | null
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
  serviceId: string | null
  serviceCode: string | null
  serviceImageUrl: string | null
  issueNameAr: string | null
  issueNameEn: string | null
  executionMode: ExecutionMode
  pricingType: PricingType
  status: ServiceItemStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  baseAmount: number
  unitPrice: number | null
  pricedQuantity: number | null
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

// ── Customers/CustomerScheduleDtos.cs
export interface ScheduleSlotsRequest {
  addressId: string
  from?: string | null
  days: number
}
export interface ScheduleDayResponse {
  date: string
  slots: ScheduleSlotResponse[]
}
export interface ScheduleSlotResponse {
  start: string
  end: string
  isAvailable: boolean
  reason: string | null
}

// ── Customers/CustomerServiceHistoryDtos.cs
export interface CustomerServiceHistoryItem {
  orderId: string
  serviceItemId: string
  itemNumber: string | null
  canonicalServiceId: string
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  date: string
  addressLabel: string | null
  district: string | null
  devices: CustomerServiceHistoryDevice[]
  warranty: CustomerServiceHistoryWarranty | null
}
export interface CustomerServiceHistoryDevice {
  name: string
  brand: string | null
  model: string | null
}
export interface CustomerServiceHistoryWarranty {
  warrantyId: string
  warrantyNumber: string
  status: WarrantyStatus
  endsAt: string
}

// ── Executors/ExecutorAiDtos.cs
export interface SuggestQuotationRequest {
  findings?: string | null
}
export interface QuotationSuggestionResponse {
  source: string
  lines: SuggestedQuotationLine[]
  summary: string | null
  checks: string[]
  estimatedTotal: number
}
export interface SuggestedQuotationLine {
  priceItemId: string
  code: string
  nameAr: string
  nameEn: string
  itemType: PriceItemType
  quantity: number
  unitPrice: number
  maxUnitPrice: number | null
  reason: string | null
}
export interface JobBriefResponse {
  serviceItemId: string
  text: string
  source: string
  createdAt: string
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
  canRepair: boolean
  canDeliver: boolean
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

// ── Executors/TrackingDtos.cs
export interface ServiceTrackingResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  itemStatus: ServiceItemStatus
  executionMode: ExecutionMode
  expectedReadyAt: string | null
  lastUpdateAt: string | null
  handoverCode: string | null
  hasCustody: boolean
  devices: TrackedDevice[]
  updates: ProgressUpdateResponse[]
  legs: LegResponse[]
}
export interface TrackedDevice {
  deviceId: string
  name: string
  brand: string | null
  model: string | null
  tagCode: string | null
  stage: DeviceCustodyStage
  holderName: string | null
  stageAt: string | null
  events: CustodyEventResponse[]
}
export interface CustodyEventResponse {
  id: string
  stage: DeviceCustodyStage
  actorName: string
  photoUrl: string | null
  note: string | null
  codeVerified: boolean
  createdAt: string
}
export interface ProgressUpdateResponse {
  id: string
  kind: ProgressUpdateKind
  note: string | null
  photoUrl: string | null
  expectedReadyAt: string | null
  authorSide: ConversationSide
  authorName: string
  createdAt: string
}
export interface LegResponse {
  id: string
  type: ServiceItemLegType
  status: ServiceItemLegStatus
  executorId: string
  executorName: string
  scheduledStart: string | null
  scheduledEnd: string | null
  completedAt: string | null
}
export interface PostProgressUpdateRequest {
  kind: ProgressUpdateKind
  note?: string | null
  expectedReadyAt?: string | null
}
export interface MoveDeviceRequest {
  stage: DeviceCustodyStage
  code?: string | null
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}
export interface PlanLegRequest {
  type: ServiceItemLegType
  executorId: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
}
export interface MyLegResponse extends LegResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  customerFirstName: string | null
  city: string | null
  district: string | null
  addressText: string | null
  latitude: number | null
  longitude: number | null
  devicesCount: number
  devices: TrackedDevice[]
}
export interface WorkshopBoardRequest {
  stage?: DeviceCustodyStage | null
}
export interface WorkshopBoardResponse {
  counts: WorkshopStageCount[]
  devices: WorkshopDevice[]
}
export interface WorkshopStageCount {
  stage: DeviceCustodyStage
  count: number
}
export interface WorkshopDevice {
  deviceId: string
  name: string
  brand: string | null
  model: string | null
  tagCode: string | null
  stage: DeviceCustodyStage
  stageAt: string | null
  holderName: string | null
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  itemStatus: ServiceItemStatus
  technicianName: string | null
  expectedReadyAt: string | null
  lastUpdateAt: string | null
  needsUpdate: boolean
  needsReturnTrip: boolean
}
export interface SetExecutorRolesRequest {
  canRepair: boolean
  canDeliver: boolean
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

// ── Messaging/ServiceMessageDtos.cs
export interface ServiceConversationResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  itemStatus: ServiceItemStatus
  canSend: boolean
  customerName: string | null
  providerName: string | null
  executorName: string | null
  messages: ServiceMessageResponse[]
}
export interface ServiceMessageResponse {
  id: string
  senderSide: ConversationSide
  senderName: string
  isMine: boolean
  text: string | null
  imageUrl: string | null
  createdAt: string
}
export interface SendServiceMessageRequest {
  text?: string | null
}
export interface ServiceConversationSummary {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  itemStatus: ServiceItemStatus
  counterpartName: string | null
  lastMessageText: string | null
  lastMessageSide: ConversationSide
  lastMessageAt: string
  unreadCount: number
}
export interface ServiceInboxRequest extends PaginatedRequest {
  unreadOnly?: boolean | null
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

// ── Notifications/PushDtos.cs
export interface RegisterPushDeviceRequest {
  token: string
  platform: PushPlatform
  app: PushApp
  deviceId?: string | null
  appVersion?: string | null
}
export interface PushDeviceResponse {
  id: string
  platform: PushPlatform
  app: PushApp
  deviceId: string | null
  appVersion: string | null
  createdAt: string
  lastSeenAt: string
}
export interface UnregisterPushDeviceRequest {
  token: string
}
export interface PushStatusResponse {
  provider: string
  configured: boolean
  projectId: string | null
  problem: string | null
  devices: number
  devicesByApp: PushDeviceCount[]
  last24Hours: PushOutcomeCount[]
}
export interface PushDeviceCount {
  app: PushApp
  platform: PushPlatform
  count: number
}
export interface PushOutcomeCount {
  status: NotificationPushStatus
  count: number
}
export interface SendTestPushRequest {
  userId: string
  title?: string | null
  body?: string | null
}
export interface SendTestPushResponse {
  notificationId: string
  status: NotificationPushStatus
  devices: number
  delivered: number
  errors: string[]
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

// ── Operations/DemoStoreDtos.cs
export interface DemoStoreProductsResponse {
  created: number
  restored: number
  productsCount: number
  activeCount: number
  products: StoreProductResponse[]
}
export interface DemoStoreRetireResponse {
  deleted: number
  deactivated: number
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

// ── Operations/TestCustomerDtos.cs
export interface TestCustomerDataRequest {
  phoneNumber: string
  allowExistingOrders: boolean
}
export interface TestCustomerDataResponse {
  customerId: string
  phoneNumber: string
  customerCreated: boolean
  replaced: boolean
  orders: TestCustomerOrderResponse[]
  storeOrderNumber: string | null
  addressesCount: number
  favoritesCount: number
}
export interface TestCustomerOrderResponse {
  orderId: string
  orderNumber: string
  orderStatus: ParentOrderStatus
  itemStatus: ServiceItemStatus
  serviceNameAr: string
  providerName: string | null
}
export interface TestCustomerRemoveResponse {
  ordersRemoved: number
  storeOrdersRemoved: number
  addressesRemoved: number
  favoritesRemoved: number
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
  canRepair: boolean
  canDeliver: boolean
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

// ── Providers/ProviderGrowthDtos.cs
export interface WalletResponse {
  availableAmount: number
  availableItems: number
  onHoldAmount: number
  onHoldItems: number
  nextReleaseAt: string | null
  inProcessingAmount: number
  paidAmount: number
  lastPaidAt: string | null
  currency: string
  minWithdrawalAmount: number
  holdDays: number
  hasOpenWithdrawal: boolean
  canWithdraw: boolean
  cannotWithdrawReason: string | null
  bankAccount: BankAccountResponse | null
}
export interface BankAccountResponse {
  bankName: string
  ibanMasked: string
  accountHolderName: string
}
export interface UpdateBankAccountRequest {
  bankName: string
  iban: string
  accountHolderName: string
}
export interface BankAccountDetailResponse {
  bankName: string | null
  iban: string | null
  accountHolderName: string | null
}
export interface WalletItemResponse {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  completedAt: string
  grossAmount: number
  commissionAmount: number
  netAmount: number
  availableAt: string | null
}
export interface WalletItemsRequest extends PaginatedRequest {
  bucket?: WalletItemsBucket
}
export interface CreateWithdrawalRequest {
  note?: string | null
}
export interface WithdrawalListRequest extends PaginatedRequest {
  status?: ProviderWithdrawalStatus | null
}
export interface WithdrawalResponse {
  id: string
  status: ProviderWithdrawalStatus
  amount: number
  itemsCount: number
  bankName: string
  ibanMasked: string
  accountHolderName: string
  note: string | null
  rejectionReason: string | null
  settlementId: string | null
  settlementNumber: string | null
  paymentReference: string | null
  createdAt: string
  paidAt: string | null
  closedAt: string | null
}
export interface AdminWithdrawalResponse extends WithdrawalResponse {
  providerOrganizationId: string
  organizationName: string
  iban: string
  requestedBy: string | null
}
export interface AdminWithdrawalListRequest extends PaginatedRequest {
  status?: ProviderWithdrawalStatus | null
  providerOrganizationId?: string | null
}
export interface RejectWithdrawalRequest {
  reason: string
}
export interface ProviderDemandRequest {
  radiusKm: number
}
export interface ProviderDemandResponse {
  waitingCustomers: number
  baseLatitude: number | null
  baseLongitude: number | null
  rows: ProviderDemandRow[]
}
export interface ProviderDemandRow {
  canonicalServiceId: string
  serviceNameAr: string
  serviceNameEn: string
  city: string
  district: string | null
  waiting: number
  oldestSince: string
  distanceKm: number | null
  needsCapability: boolean
  needsCoverage: boolean
  missingCapabilityIds: string[]
}
export interface TeamPerformanceRequest {
  from?: string | null
  to?: string | null
}
export interface TeamPerformanceResponse {
  from: string
  to: string
  executors: ExecutorPerformance[]
}
export interface ExecutorPerformance {
  executorId: string
  fullName: string
  isActive: boolean
  completed: number
  averageRating: number | null
  ratingsCount: number
  onTimeRate: number | null
  scheduledArrivals: number
  acceptanceRate: number | null
  assignmentsOffered: number
  assignmentsRejected: number
  averageWorkMinutes: number | null
  warrantyClaims: number
  disputes: number
  cancelledAfterAssignment: number
  revenue: number
}
export interface ExecutorScheduleResponse {
  executorId: string
  workingHours: WorkingHoursEntry[]
  timeOff: TimeOffResponse[]
  timeZone: string
  isOffNow: boolean
}
export interface WorkingHoursEntry {
  dayOfWeek: DayOfWeek
  start: string
  end: string
}
export interface UpdateWorkingHoursRequest {
  days: WorkingHoursEntry[]
}
export interface TimeOffResponse {
  id: string
  startsAt: string
  endsAt: string
  reason: ExecutorTimeOffReason
  note: string | null
  conflictingJobs: number
}
export interface CreateTimeOffRequest {
  startsAt: string
  endsAt: string
  reason: ExecutorTimeOffReason
  note?: string | null
}
export interface TeamMapResponse {
  generatedAt: string
  baseLatitude: number | null
  baseLongitude: number | null
  executors: TeamMapExecutor[]
  jobs: TeamMapJob[]
}
export interface TeamMapExecutor {
  executorId: string
  fullName: string
  availability: ExecutorAvailability
  isOffNow: boolean
  latitude: number | null
  longitude: number | null
  locationAt: string | null
  locationStale: boolean
  activeJobs: number
  currentJobId: string | null
  distanceToJobKm: number | null
  etaMinutes: number | null
}
export interface TeamMapJob {
  serviceItemId: string
  itemNumber: string | null
  serviceNameAr: string
  serviceNameEn: string
  status: ServiceItemStatus
  executorId: string | null
  executorName: string | null
  latitude: number | null
  longitude: number | null
  district: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  isLate: boolean
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
  canRepair: boolean
  canDeliver: boolean
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

// ── Store/StoreCatalogDtos.cs
export interface StoreProductSpecDto {
  labelAr: string
  labelEn: string
  valueAr: string
  valueEn: string
}
export interface StoreProductOptionDto {
  kind: StoreOptionKind
  nameAr: string
  nameEn: string
  values: StoreProductOptionValueDto[]
}
export interface StoreProductOptionValueDto {
  key: string
  valueAr: string
  valueEn: string
  colorHex: string | null
}
export interface StoreProductVariantRequest {
  id?: string | null
  sku?: string | null
  optionValues: string[]
  price: number
  compareAtPrice?: number | null
  stockQuantity: number
  imageId?: string | null
  isActive: boolean
}
export interface UploadStoreImageRequest {
  cleanWithAi: boolean
}
export interface ReprocessStoreImageRequest {
  cleanWithAi: boolean
}
export interface StoreProductImageResponse {
  id: string
  productId: string | null
  status: StoreProductImageStatus
  imageUrl: string | null
  sourceUrl: string | null
  cleanWithAi: boolean
  aiCleaned: boolean
  error: string | null
  sortOrder: number
  createdAt: string
  processedAt: string | null
}
export interface StoreProductVariantResponse {
  id: string
  sku: string
  optionValues: string[]
  labelAr: string
  labelEn: string
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  imageId: string | null
  imageUrl: string | null
  isActive: boolean
}
export interface StoreCategoryListRequest {
  status?: ActiveFilter | null
}
export interface CreateStoreCategoryRequest {
  code: string
  parentId?: string | null
  nameAr: string
  nameEn: string
  iconKey?: string | null
  sortOrder: number
}
export interface UpdateStoreCategoryRequest {
  nameAr: string
  nameEn: string
  iconKey?: string | null
  sortOrder: number
}
export interface SetStoreCategoryActiveRequest {
  isActive: boolean
}
export interface StoreCategoryResponse {
  id: string
  code: string
  parentId: string | null
  nameAr: string
  nameEn: string
  iconKey: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  productsCount: number
  children: StoreCategoryResponse[]
}
export interface StoreProductAiDraftRequest {
  imageIds: string[]
  hint?: string | null
  categoryId?: string | null
}
export interface StoreProductDraftResponse {
  product: CreateStoreProductRequest
  categoryNameAr: string | null
  categoryNameEn: string | null
  notes: string[]
}
export interface StoreGalleryImageResponse {
  id: string
  imageUrl: string
}
export interface StoreCustomerVariantResponse {
  id: string
  optionValues: string[]
  labelAr: string
  labelEn: string
  price: number
  compareAtPrice: number | null
  discountPercent: number | null
  inStock: boolean
  availableStock: number
  imageId: string | null
}
export interface StoreProductDetailResponse extends StoreProductCardResponse {
  sectionId: string | null
  sectionNameAr: string | null
  sectionNameEn: string | null
  categoryNameAr: string | null
  categoryNameEn: string | null
  images: StoreGalleryImageResponse[]
  highlightsAr: string[]
  highlightsEn: string[]
  specs: StoreProductSpecDto[]
  options: StoreProductOptionDto[]
  variants: StoreCustomerVariantResponse[]
  related: StoreProductCardResponse[]
}
export interface StoreHomeRailResponse {
  key: string
  titleAr: string
  titleEn: string
  categoryId: string | null
  products: StoreProductCardResponse[]
}
export interface StoreHomeResponse {
  sections: StoreCategoryResponse[]
  rails: StoreHomeRailResponse[]
}

// ── Store/StoreDtos.cs
export interface StoreProductListRequest extends PaginatedRequest {
  status?: ActiveFilter | null
  providerOrganizationId?: string | null
  search?: string | null
  categoryId?: string | null
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
  categoryId?: string | null
  brand?: string | null
  compareAtPrice?: number | null
  highlightsAr?: string[] | null
  highlightsEn?: string[] | null
  specs?: StoreProductSpecDto[] | null
  keywords?: string | null
  imageIds?: string[] | null
  options?: StoreProductOptionDto[] | null
  variants?: StoreProductVariantRequest[] | null
}
export interface CreateStoreProductRequest extends UpdateStoreProductRequest {
  stockQuantity: number
  fromAiDraft: boolean
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
  categoryId?: string | null
  onSale?: boolean
  sort?: StoreProductSort | null
}
export interface AddStoreCartItemRequest {
  productId: string
  variantId?: string | null
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
  compareAtPrice: number | null
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
  categoryId: string | null
  categoryNameAr: string | null
  categoryNameEn: string | null
  sectionId: string | null
  sectionNameAr: string | null
  sectionNameEn: string | null
  brand: string | null
  highlightsAr: string[]
  highlightsEn: string[]
  specs: StoreProductSpecDto[]
  keywords: string | null
  images: StoreProductImageResponse[]
  options: StoreProductOptionDto[]
  variants: StoreProductVariantResponse[]
  hasVariants: boolean
  soldCount: number
  isAiGenerated: boolean
  missingForSale: string[]
}
export interface StoreProductCardResponse {
  id: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  price: number
  compareAtPrice: number | null
  discountPercent: number | null
  currency: string
  imageUrl: string | null
  brand: string | null
  categoryId: string | null
  hasVariants: boolean
  colorSwatches: string[]
  isNew: boolean
  inStock: boolean
  availableStock: number
  requiresDelivery: boolean
  requiresInstallation: boolean
  providerName: string | null
}
export interface StoreCartItemResponse {
  id: string
  productId: string
  variantId: string | null
  productNameAr: string
  productNameEn: string
  variantLabelAr: string | null
  variantLabelEn: string | null
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
  variantId: string | null
  productNameAr: string
  productNameEn: string
  variantLabelAr: string | null
  variantLabelEn: string | null
  imageUrl: string | null
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

// ── Support/SupportDtos.cs
export interface CreateSupportTicketRequest {
  subject: string
  description: string
  category: SupportTicketCategory
  priority?: SupportTicketPriority | null
  parentOrderId?: string | null
  serviceItemId?: string | null
}
export interface SupportTicketListRequest extends PaginatedRequest {
  status?: SupportTicketStatus | null
  openOnly?: boolean | null
}
export interface SendSupportMessageRequest {
  body?: string | null
}
export interface SupportTicketSummaryResponse {
  id: string
  ticketNumber: string
  kind: SupportTicketKind
  category: SupportTicketCategory
  priority: SupportTicketPriority
  status: SupportTicketStatus
  subject: string
  hasUnread: boolean
  lastMessagePreview: string | null
  orderNumber: string | null
  itemNumber: string | null
  createdAt: string
  updatedAt: string
}
export interface SupportAttachmentResponse {
  id: string
  url: string
  fileName: string
  contentType: string
  sizeBytes: number
}
export interface SupportMessageResponse {
  id: string
  authorSide: SupportMessageSide
  authorName: string
  isMine: boolean
  body: string
  isInternal: boolean
  attachments: SupportAttachmentResponse[]
  createdAt: string
}
export interface SupportEventResponse {
  type: SupportTicketEventType
  fromValue: string | null
  toValue: string | null
  note: string | null
  actorName: string | null
  isInternal: boolean
  createdAt: string
}
export interface SupportTicketLinkResponse {
  orderId: string | null
  orderNumber: string | null
  serviceItemId: string | null
  itemNumber: string | null
  serviceNameAr: string | null
  serviceNameEn: string | null
}
export interface SupportTicketResponse extends SupportTicketSummaryResponse {
  description: string
  link: SupportTicketLinkResponse | null
  attachments: SupportAttachmentResponse[]
  messages: SupportMessageResponse[]
  events: SupportEventResponse[]
  canReply: boolean
  canClose: boolean
  resolvedAt: string | null
  closedAt: string | null
}
export interface AdminSupportTicketListRequest extends PaginatedRequest {
  kind?: SupportTicketKind | null
  status?: SupportTicketStatus | null
  openOnly?: boolean | null
  priority?: SupportTicketPriority | null
  category?: SupportTicketCategory | null
  assignedToUserId?: string | null
  unassigned?: boolean | null
  mine?: boolean | null
  requesterUserId?: string | null
  from?: string | null
  to?: string | null
  search?: string | null
}
export interface SupportRequesterResponse {
  userId: string
  fullName: string
  phone: string | null
  role: Role
  providerOrganizationId: string | null
  providerOrganizationName: string | null
}
export interface AdminSupportTicketListItemResponse extends SupportTicketSummaryResponse {
  channel: SupportChannel
  requester: SupportRequesterResponse
  assignedTo: PersonLookupResponse | null
  messagesCount: number
}
export interface AdminSupportTicketResponse extends AdminSupportTicketListItemResponse {
  description: string
  link: SupportTicketLinkResponse | null
  attachments: SupportAttachmentResponse[]
  messages: SupportMessageResponse[]
  events: SupportEventResponse[]
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
}
export interface AdminSupportReplyRequest {
  body?: string | null
  isInternal: boolean
  status?: SupportTicketStatus | null
}
export interface UpdateSupportTicketStatusRequest {
  status: SupportTicketStatus
  note?: string | null
}
export interface AssignSupportTicketRequest {
  assignedToUserId?: string | null
}
export interface UpdateSupportTicketPriorityRequest {
  priority: SupportTicketPriority
}
export interface SupportSummaryResponse {
  openCustomerReports: number
  openTechnicianComplaints: number
  openDashboardTickets: number
  new: number
  unassigned: number
  assignedToMe: number
  urgent: number
  awaitingSupport: number
}
