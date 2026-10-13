import { z } from 'zod'
import type { StoreProductResponse, UpdateStoreProductRequest } from '@/api/types'

/** Server limits (`StoreValidators`). */
export const SKU_MAX = 60
export const NAME_MAX = 200
export const DESCRIPTION_MAX = 4000

/**
 * The product form. Messages are error codes: the server's where one exists (`ProductPriceInvalid`,
 * `StockQuantityInvalid`, `InstallationServiceRequired`), otherwise client-only ones.
 * Stock is only part of create; edit uses the stock movement instead.
 */
export const productFormSchema = z
  .object({
    sku: z.string().trim().min(1, 'required').max(SKU_MAX, 'tooLong'),
    nameAr: z.string().trim().min(1, 'required').max(NAME_MAX, 'tooLong'),
    nameEn: z.string().trim().min(1, 'required').max(NAME_MAX, 'tooLong'),
    descriptionAr: z.string().max(DESCRIPTION_MAX, 'tooLong'),
    descriptionEn: z.string().max(DESCRIPTION_MAX, 'tooLong'),
    price: z
      .string()
      .trim()
      .min(1, 'required')
      .refine((v) => {
        const n = Number(v)
        return Number.isFinite(n) && n >= 0
      }, 'ProductPriceInvalid'),
    stockQuantity: z
      .string()
      .trim()
      .refine((v) => {
        const n = Number(v === '' ? NaN : v)
        return Number.isInteger(n) && n >= 0
      }, 'StockQuantityInvalid'),
    requiresDelivery: z.boolean(),
    requiresInstallation: z.boolean(),
    deliveryServiceId: z.string().nullable(),
    installationServiceId: z.string().nullable(),
  })
  .refine((v) => !v.requiresInstallation || !!v.installationServiceId, { path: ['installationServiceId'], message: 'InstallationServiceRequired' })

export type ProductFormValues = z.infer<typeof productFormSchema>
export type ProductFieldError = 'required' | 'tooLong' | 'ProductPriceInvalid' | 'StockQuantityInvalid' | 'InstallationServiceRequired'

export function productFieldErrors(values: ProductFormValues): Partial<Record<keyof ProductFormValues, ProductFieldError>> {
  const result = productFormSchema.safeParse(values)
  if (result.success) return {}
  const out: Partial<Record<keyof ProductFormValues, ProductFieldError>> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ProductFormValues
    if (!out[key]) out[key] = issue.message as ProductFieldError
  }
  return out
}

export function productFormDefaults(product: StoreProductResponse | null): ProductFormValues {
  return {
    sku: product?.sku ?? '',
    nameAr: product?.nameAr ?? '',
    nameEn: product?.nameEn ?? '',
    descriptionAr: product?.descriptionAr ?? '',
    descriptionEn: product?.descriptionEn ?? '',
    price: product ? String(product.price) : '',
    // Edit has no stock field; "0" keeps the shared schema valid.
    stockQuantity: '0',
    requiresDelivery: product?.requiresDelivery ?? false,
    requiresInstallation: product?.requiresInstallation ?? false,
    deliveryServiceId: product?.deliveryServiceId ?? null,
    installationServiceId: product?.installationServiceId ?? null,
  }
}

/**
 * Valid values → PUT body (POST adds `stockQuantity`). A linked service is only sent while its
 * checkbox is on, so a hidden picker never carries a stale id.
 */
export function toProductRequest(v: ProductFormValues): UpdateStoreProductRequest {
  return {
    sku: v.sku.trim(),
    nameAr: v.nameAr.trim(),
    nameEn: v.nameEn.trim(),
    descriptionAr: v.descriptionAr.trim() || null,
    descriptionEn: v.descriptionEn.trim() || null,
    price: Number(v.price.trim()),
    requiresDelivery: v.requiresDelivery,
    requiresInstallation: v.requiresInstallation,
    deliveryServiceId: v.requiresDelivery ? v.deliveryServiceId || null : null,
    installationServiceId: v.requiresInstallation ? v.installationServiceId || null : null,
  }
}

export type StockDeltaCheck = { ok: true; delta: number; next: number } | { ok: false; reason: 'empty' | 'invalid' | 'negative'; next: number }

/** `PATCH …/stock { delta }`: a non-zero whole number that doesn't take stock below zero (`InsufficientStock`). */
export function checkStockDelta(raw: string, current: number): StockDeltaCheck {
  const s = raw.trim()
  if (s === '') return { ok: false, reason: 'empty', next: current }
  const delta = Number(s)
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, reason: 'invalid', next: current }
  const next = current + delta
  if (next < 0) return { ok: false, reason: 'negative', next }
  return { ok: true, delta, next }
}

/** `InsufficientStock` error data. */
export function insufficientStockAvailable(details: unknown): number | null {
  if (details && typeof details === 'object' && 'available' in details) {
    const n = (details as { available: unknown }).available
    return typeof n === 'number' ? n : null
  }
  return null
}
