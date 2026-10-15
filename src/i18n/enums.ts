import type * as T from '@/api/types.gen'

/**
 * Labels and tones for every backend enum the provider platform shows — provider wording (§9 of the brief).
 * `enums.test.ts` asserts each generated `XValues` array is fully covered, so a new backend
 * value fails the test suite instead of reaching the screen raw. Unknown values at runtime
 * still render (raw, neutral) — see `enumLabel`.
 */

export type Tone = 'neutral' | 'info' | 'waiting' | 'active' | 'attention' | 'success' | 'danger' | 'muted'

export interface EnumEntry {
  ar: string
  en: string
  tone?: Tone
}

type EnumMap<V extends string> = Record<V, EnumEntry>

const e = (ar: string, en: string, tone?: Tone): EnumEntry => ({ ar, en, tone })

export const ServiceItemStatus: EnumMap<T.ServiceItemStatus> = {
  Created: e('في السلة', 'In cart', 'neutral'),
  PendingAssignment: e('بانتظار الإسناد', 'Pending assignment', 'waiting'),
  AssignedToProvider: e('بانتظار اختيار فني', 'Needs a technician', 'waiting'),
  AssignedToExecutor: e('بانتظار قبول الفني', 'Awaiting technician', 'info'),
  Accepted: e('قبلها الفني', 'Accepted', 'info'),
  Scheduled: e('مجدولة', 'Scheduled', 'info'),
  EnRoute: e('الفني في الطريق', 'En route', 'active'),
  Arrived: e('الفني وصل', 'Arrived', 'active'),
  Assessment: e('فحص وتشخيص', 'Assessment', 'active'),
  WaitingCustomerApproval: e('بانتظار موافقة العميل على العرض', 'Awaiting quote approval', 'attention'),
  InProgress: e('قيد التنفيذ', 'In progress', 'active'),
  WaitingCustomerConfirmation: e('بانتظار تأكيد العميل', 'Awaiting customer confirmation', 'attention'),
  Completed: e('مكتملة', 'Completed', 'success'),
  Cancelled: e('ملغاة', 'Cancelled', 'muted'),
  Rejected: e('اعتذر الفني — اختر غيره', 'Technician declined — pick another', 'danger'),
  Paused: e('موقوفة', 'Paused', 'attention'),
  Disputed: e('عليها شكوى', 'Has a complaint', 'danger'),
  Refunded: e('مستردة', 'Refunded', 'muted'),
  PartiallyRefunded: e('مستردة جزئيًا', 'Partially refunded', 'success'),
}

/** Lifecycle order — used for charts and sorting. */
export const SERVICE_ITEM_LIFECYCLE: readonly T.ServiceItemStatus[] = [
  'Created', 'PendingAssignment', 'AssignedToProvider', 'AssignedToExecutor', 'Accepted', 'Scheduled',
  'EnRoute', 'Arrived', 'Assessment', 'WaitingCustomerApproval', 'InProgress', 'WaitingCustomerConfirmation',
  'Completed', 'Cancelled', 'Rejected', 'Paused', 'Disputed', 'Refunded', 'PartiallyRefunded',
]

export const ParentOrderStatus: EnumMap<T.ParentOrderStatus> = {
  Draft: e('سلة', 'Cart', 'neutral'),
  PendingPayment: e('بانتظار الدفع', 'Pending payment', 'waiting'),
  InProgress: e('قيد التنفيذ', 'In progress', 'active'),
  Completed: e('مكتمل', 'Completed', 'success'),
  Cancelled: e('ملغى', 'Cancelled', 'muted'),
}

export const PaymentStatus: EnumMap<T.PaymentStatus> = {
  Pending: e('معلّق', 'Pending', 'waiting'),
  Authorized: e('مصرّح', 'Authorized', 'info'),
  Paid: e('مدفوع', 'Paid', 'success'),
  Failed: e('فشل', 'Failed', 'danger'),
  Refunded: e('مسترد', 'Refunded', 'muted'),
  PartiallyRefunded: e('مسترد جزئيًا', 'Partially refunded', 'attention'),
}

export const PaymentMethod: EnumMap<T.PaymentMethod> = {
  Cash: e('نقدًا', 'Cash', 'neutral'),
  Card: e('بطاقة', 'Card', 'neutral'),
  Wallet: e('محفظة', 'Wallet', 'neutral'),
  BankTransfer: e('تحويل بنكي', 'Bank transfer', 'neutral'),
  ApplePay: e('Apple Pay', 'Apple Pay', 'neutral'),
}

export const OrderSource: EnumMap<T.OrderSource> = {
  CustomerApp: e('تطبيق العميل', 'Customer app', 'neutral'),
  SmartRequest: e('الطلب الذكي', 'Smart request', 'info'),
  Admin: e('الإدارة', 'Admin', 'active'),
  Store: e('المتجر', 'Store', 'neutral'),
}

export const ProviderVerificationStatus: EnumMap<T.ProviderVerificationStatus> = {
  Draft: e('مسودة', 'Draft', 'neutral'),
  Submitted: e('مُرسل', 'Submitted', 'waiting'),
  UnderReview: e('قيد المراجعة', 'Under review', 'info'),
  Approved: e('معتمد', 'Approved', 'success'),
  Trial: e('تجريبي', 'Trial', 'active'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
  Suspended: e('موقوف', 'Suspended', 'attention'),
}

export const ProviderBusinessModel: EnumMap<T.ProviderBusinessModel> = {
  ExecutionPartner: e('تنفيذ الطلبات', 'Execution partner', 'neutral'),
  MarketplacePartner: e('المناقصات', 'Marketplace partner', 'neutral'),
  Both: e('التنفيذ والمناقصات', 'Both', 'neutral'),
}

export const ProviderType: EnumMap<T.ProviderType> = {
  IndependentTechnician: e('فني مستقل', 'Independent technician', 'neutral'),
  Company: e('شركة صيانة', 'Maintenance company', 'neutral'),
}

export const ProviderDocumentType: EnumMap<T.ProviderDocumentType> = {
  CommercialRegistration: e('سجل تجاري', 'Commercial registration'),
  NationalId: e('هوية وطنية', 'National ID'),
  ProfessionalLicense: e('رخصة مهنية', 'Professional license'),
  Insurance: e('تأمين', 'Insurance'),
  TaxCertificate: e('شهادة ضريبية', 'Tax certificate'),
  Other: e('أخرى', 'Other'),
}

export const ProviderDocumentStatus: EnumMap<T.ProviderDocumentStatus> = {
  Pending: e('بانتظار المراجعة', 'Pending review', 'waiting'),
  Approved: e('معتمدة', 'Approved', 'success'),
  Rejected: e('مرفوضة', 'Rejected', 'danger'),
  Expired: e('منتهية', 'Expired', 'muted'),
}

export const ProviderMemberRole: EnumMap<T.ProviderMemberRole> = {
  Owner: e('مالك', 'Owner', 'active'),
  Supervisor: e('مشرف', 'Supervisor', 'info'),
  Executor: e('فني', 'Technician', 'neutral'),
}

export const ExecutorAvailability: EnumMap<T.ExecutorAvailability> = {
  Available: e('متاح', 'Available', 'success'),
  Busy: e('مشغول', 'Busy', 'waiting'),
  Offline: e('غير متصل', 'Offline', 'muted'),
  OnLeave: e('في إجازة', 'On leave', 'muted'),
}

export const ExecutionMode: EnumMap<T.ExecutionMode> = {
  Appliance: e('صيانة أجهزة', 'Appliance repair'),
  DirectRepair: e('إصلاح مباشر', 'Direct repair'),
  ScheduledService: e('خدمة مجدولة', 'Scheduled service'),
  ProjectService: e('مشروع', 'Project'),
  Delivery: e('توصيل', 'Delivery'),
  Workshop: e('ورشة', 'Workshop'),
}

export const PricingType: EnumMap<T.PricingType> = {
  Fixed: e('سعر ثابت', 'Fixed price'),
  InspectionThenQuote: e('معاينة ثم عرض', 'Inspection then quote'),
  QuoteRequired: e('بعرض سعر', 'Quote required'),
}

export const AssignmentType: EnumMap<T.AssignmentType> = {
  ProviderAssignment: e('إسناد مزود', 'Provider assignment', 'info'),
  ExecutorAssignment: e('إسناد فني', 'Technician assignment', 'active'),
}

export const AssignmentStatus: EnumMap<T.AssignmentStatus> = {
  Pending: e('معلّق', 'Pending', 'waiting'),
  Accepted: e('مقبول', 'Accepted', 'success'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
  Reassigned: e('أعيد إسناده', 'Reassigned', 'muted'),
  Cancelled: e('ملغى', 'Cancelled', 'muted'),
}

export const ActorType: EnumMap<T.ActorType> = {
  System: e('النظام', 'System', 'neutral'),
  Customer: e('العميل', 'Customer', 'info'),
  Admin: e('الإدارة', 'Admin', 'active'),
  Provider: e('المزود', 'Provider', 'success'),
  Executor: e('الفني', 'Technician', 'attention'),
}

export const CancellationInitiator: EnumMap<T.CancellationInitiator> = {
  Customer: e('العميل', 'Customer'),
  Admin: e('الإدارة', 'Admin'),
  Provider: e('المزود', 'Provider'),
  Executor: e('الفني', 'Technician'),
  System: e('النظام', 'System'),
}

export const QuotationStatus: EnumMap<T.QuotationStatus> = {
  Draft: e('مسودة', 'Draft', 'neutral'),
  Sent: e('مرسل', 'Sent', 'waiting'),
  Approved: e('موافق عليه', 'Approved', 'success'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
  Expired: e('منتهي', 'Expired', 'muted'),
  Cancelled: e('ملغى', 'Cancelled', 'muted'),
}

export const PriceItemType: EnumMap<T.PriceItemType> = {
  Labor: e('أجور', 'Labor', 'info'),
  Part: e('قطع', 'Part', 'neutral'),
  AddOn: e('إضافات', 'Add-on', 'active'),
  Inspection: e('معاينة', 'Inspection', 'waiting'),
  Discount: e('خصم', 'Discount', 'success'),
}

export const EvidenceStage: EnumMap<T.EvidenceStage> = {
  CustomerRequest: e('صور العميل', 'Customer photos'),
  Before: e('قبل', 'Before'),
  During: e('أثناء', 'During'),
  After: e('بعد', 'After'),
  Custody: e('الاستلام', 'Custody'),
  Handover: e('التسليم', 'Handover'),
}

export const EvidenceType: EnumMap<T.EvidenceType> = {
  Image: e('صورة', 'Image'),
  Video: e('فيديو', 'Video'),
  Document: e('مستند', 'Document'),
}

export const DynamicFieldType: EnumMap<T.DynamicFieldType> = {
  Text: e('نص', 'Text'),
  Number: e('رقم', 'Number'),
  Select: e('اختيار', 'Select'),
  MultiSelect: e('اختيار متعدد', 'Multi-select'),
  Boolean: e('نعم/لا', 'Yes/No'),
  Date: e('تاريخ', 'Date'),
  Image: e('صورة', 'Image'),
}

export const RefundStatus: EnumMap<T.RefundStatus> = {
  Requested: e('مطلوب', 'Requested', 'waiting'),
  Approved: e('معتمد', 'Approved', 'info'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
  Processed: e('منفَّذ', 'Processed', 'success'),
}

export const SettlementStatus: EnumMap<T.SettlementStatus> = {
  Pending: e('معلّقة', 'Pending', 'waiting'),
  Approved: e('معتمدة', 'Approved', 'info'),
  Paid: e('مصروفة', 'Paid', 'success'),
  OnHold: e('موقوفة', 'On hold', 'attention'),
}

export const SettlementPartyType: EnumMap<T.SettlementPartyType> = {
  Provider: e('المنشأة', 'Organization'),
  Executor: e('فني', 'Technician'),
}

export const DisputeStatus: EnumMap<T.DisputeStatus> = {
  Open: e('مفتوحة', 'Open', 'danger'),
  UnderReview: e('قيد المراجعة', 'Under review', 'info'),
  Resolved: e('تم الحل', 'Resolved', 'success'),
  Rejected: e('مغلقة', 'Closed', 'muted'),
  Escalated: e('مصعّدة', 'Escalated', 'attention'),
}

export const DisputeResolutionType: EnumMap<T.DisputeResolutionType> = {
  None: e('—', '—'),
  FullRefund: e('استرداد كامل', 'Full refund'),
  PartialRefund: e('استرداد جزئي', 'Partial refund'),
  Rework: e('إعادة تنفيذ', 'Rework'),
  NoAction: e('بدون إجراء', 'No action'),
}

export const WarrantyStatus: EnumMap<T.WarrantyStatus> = {
  Active: e('سارٍ', 'Active', 'success'),
  Expired: e('منتهٍ', 'Expired', 'muted'),
  Claimed: e('مطالبة', 'Claimed', 'attention'),
  Void: e('ملغى', 'Void', 'danger'),
}

export const MarketplaceRequestStatus: EnumMap<T.MarketplaceRequestStatus> = {
  Open: e('مفتوحة', 'Open', 'waiting'),
  Awarded: e('تمت الترسية', 'Awarded', 'success'),
  Closed: e('مغلقة', 'Closed', 'muted'),
  Cancelled: e('ملغاة', 'Cancelled', 'muted'),
}

export const MarketplaceOfferStatus: EnumMap<T.MarketplaceOfferStatus> = {
  Submitted: e('مقدَّم', 'Submitted', 'info'),
  Accepted: e('مقبول', 'Accepted', 'success'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
  Withdrawn: e('مسحوب', 'Withdrawn', 'muted'),
}

export const StoreOrderStatus: EnumMap<T.StoreOrderStatus> = {
  Draft: e('سلة', 'Cart', 'neutral'),
  PendingPayment: e('بانتظار الدفع', 'Pending payment', 'waiting'),
  Paid: e('مدفوع', 'Paid', 'info'),
  Processing: e('قيد التجهيز', 'Processing', 'active'),
  Shipped: e('تم الشحن', 'Shipped', 'active'),
  Delivered: e('تم التسليم', 'Delivered', 'success'),
  Cancelled: e('ملغى', 'Cancelled', 'muted'),
}

export const UserStatus: EnumMap<T.UserStatus> = {
  PendingApproval: e('بانتظار الموافقة', 'Pending approval', 'waiting'),
  Active: e('نشط', 'Active', 'success'),
  Suspended: e('معلّق', 'Suspended', 'danger'),
}

/** Provider withdrawals (PROVIDER-PLATFORM-PHASE2-PROMPT §1.3). */
export const ProviderWithdrawalStatus: EnumMap<T.ProviderWithdrawalStatus> = {
  Requested: e('بانتظار المراجعة', 'Awaiting review', 'waiting'),
  Approved: e('معتمد، الدفع قريبًا', 'Approved, payment soon', 'info'),
  Paid: e('تم الدفع', 'Paid', 'success'),
  OnHold: e('معلّق من المنصة', 'On hold by the platform', 'attention'),
  Cancelled: e('ملغي', 'Cancelled', 'muted'),
  Rejected: e('مرفوض', 'Rejected', 'danger'),
}

export const WalletItemsBucket: EnumMap<T.WalletItemsBucket> = {
  Available: e('المتاح', 'Available', 'success'),
  OnHold: e('المعلّق', 'On hold', 'waiting'),
}

/** Who wrote a service-conversation message (§2). */
export const ConversationSide: EnumMap<T.ConversationSide> = {
  Customer: e('العميل', 'Customer', 'info'),
  Provider: e('المنشأة', 'Provider', 'success'),
  Executor: e('الفني', 'Technician', 'attention'),
}

export const ExecutorTimeOffReason: EnumMap<T.ExecutorTimeOffReason> = {
  Leave: e('إجازة', 'Leave', 'info'),
  Sick: e('مرضية', 'Sick leave', 'attention'),
  Training: e('تدريب', 'Training', 'active'),
  Other: e('أخرى', 'Other', 'muted'),
}

export const DayOfWeek: EnumMap<T.DayOfWeek> = {
  Sunday: e('الأحد', 'Sunday'),
  Monday: e('الاثنين', 'Monday'),
  Tuesday: e('الثلاثاء', 'Tuesday'),
  Wednesday: e('الأربعاء', 'Wednesday'),
  Thursday: e('الخميس', 'Thursday'),
  Friday: e('الجمعة', 'Friday'),
  Saturday: e('السبت', 'Saturday'),
}

export const PushApp: EnumMap<T.PushApp> = {
  Customer: e('تطبيق العميل', 'Customer app'),
  Executor: e('تطبيق الفني', 'Technician app'),
  Provider: e('منصة المزود', 'Provider platform'),
  Dashboard: e('لوحة التحكم', 'Admin dashboard'),
}

export const PushPlatform: EnumMap<T.PushPlatform> = {
  Android: e('أندرويد', 'Android'),
  Ios: e('آيفون', 'iPhone'),
  Web: e('متصفح', 'Browser'),
}

export const Role: EnumMap<T.Role> = {
  SuperAdmin: e('مدير عام', 'Super admin', 'active'),
  PlatformAdmin: e('مشرف منصة', 'Platform admin', 'info'),
  Customer: e('عميل', 'Customer', 'neutral'),
  ProviderOwner: e('مالك منشأة', 'Provider owner', 'success'),
  ProviderSupervisor: e('مشرف منشأة', 'Provider supervisor', 'success'),
  Executor: e('فني', 'Technician', 'attention'),
  Supplier: e('مورّد قطع', 'Parts supplier', 'neutral'),
  // Legacy roles from the pre–Siana Plus template; still in the enum, never issued to new users.
  TenantAdmin: e('مسؤول مستأجر (قديم)', 'Tenant admin (legacy)', 'muted'),
  Manager: e('مدير (قديم)', 'Manager (legacy)', 'muted'),
  Member: e('عضو (قديم)', 'Member (legacy)', 'muted'),
}

export const ActiveFilter: EnumMap<T.ActiveFilter> = {
  Active: e('نشط', 'Active', 'success'),
  Inactive: e('غير نشط', 'Inactive', 'muted'),
  All: e('الكل', 'All'),
}

export const NotificationType: EnumMap<T.NotificationType> = {
  Info: e('معلومة', 'Info', 'info'),
  Success: e('نجاح', 'Success', 'success'),
  Warning: e('تنبيه', 'Warning', 'waiting'),
  Alert: e('إنذار', 'Alert', 'danger'),
}

export const CoverageShape: EnumMap<T.CoverageShape> = {
  CityDistrict: e('مدينة/حي', 'City / district'),
  Circle: e('دائرة', 'Circle'),
  Polygon: e('مضلّع', 'Polygon'),
}

export const ExecutionStep: EnumMap<T.ExecutionStep> = {
  Inspection: e('المعاينة', 'Inspection'),
  Diagnosis: e('التشخيص', 'Diagnosis'),
  Quotation: e('عرض السعر', 'Quotation'),
  CustomerApproval: e('موافقة العميل', 'Customer approval'),
  Repair: e('الإصلاح', 'Repair'),
  Testing: e('الاختبار', 'Testing'),
  Documentation: e('التوثيق', 'Documentation'),
  Completion: e('الإنهاء', 'Completion'),
  Assessment: e('التقييم', 'Assessment'),
  IdentifyIssue: e('تحديد المشكلة', 'Identify issue'),
  Execution: e('التنفيذ', 'Execution'),
  ScopeReview: e('مراجعة النطاق', 'Scope review'),
  PreService: e('ما قبل الخدمة', 'Pre-service'),
  CustomerConfirmation: e('تأكيد العميل', 'Customer confirmation'),
  Survey: e('المسح', 'Survey'),
  Measurements: e('القياسات', 'Measurements'),
  Scheduling: e('الجدولة', 'Scheduling'),
  Progress: e('سير العمل', 'Progress'),
  Handover: e('التسليم', 'Handover'),
  Pickup: e('الاستلام', 'Pickup'),
  CustodyDocumentation: e('توثيق الاستلام', 'Custody documentation'),
  Transport: e('النقل', 'Transport'),
  Delivery: e('التوصيل', 'Delivery'),
  Verification: e('التحقق', 'Verification'),
  DeviceIntake: e('استلام الجهاز', 'Device intake'),
  Return: e('الإرجاع', 'Return'),
}

export const enumMaps = {
  ServiceItemStatus, ParentOrderStatus, PaymentStatus, PaymentMethod, OrderSource,
  ProviderVerificationStatus, ProviderBusinessModel, ProviderType, ProviderDocumentType,
  ProviderDocumentStatus, ProviderMemberRole, ExecutorAvailability, ExecutionMode, PricingType,
  AssignmentType, AssignmentStatus, ActorType, CancellationInitiator, QuotationStatus, PriceItemType,
  EvidenceStage, EvidenceType, DynamicFieldType, RefundStatus, SettlementStatus, SettlementPartyType,
  DisputeStatus, DisputeResolutionType, WarrantyStatus, MarketplaceRequestStatus, MarketplaceOfferStatus,
  StoreOrderStatus, UserStatus, Role, ActiveFilter, NotificationType, ExecutionStep, CoverageShape,
  ProviderWithdrawalStatus, WalletItemsBucket, ConversationSide, ExecutorTimeOffReason, DayOfWeek, PushApp, PushPlatform,
} as const

export type EnumName = keyof typeof enumMaps

/** Label in the given language; unknown values come back raw (never crash). */
export function enumLabel(name: EnumName, value: string | null | undefined, lang: string): string {
  if (value === null || value === undefined || value === '') return '—'
  const entry = (enumMaps[name] as Record<string, EnumEntry>)[value]
  if (!entry) return value
  return lang === 'en' ? entry.en : entry.ar
}

export function enumTone(name: EnumName, value: string | null | undefined): Tone {
  if (!value) return 'neutral'
  return (enumMaps[name] as Record<string, EnumEntry>)[value]?.tone ?? 'neutral'
}

/** Values of an enum in declaration order, for select options. */
export function enumOptions<N extends EnumName>(name: N): Array<keyof (typeof enumMaps)[N] & string> {
  return Object.keys(enumMaps[name]) as Array<keyof (typeof enumMaps)[N] & string>
}
