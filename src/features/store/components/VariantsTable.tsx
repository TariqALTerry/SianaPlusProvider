import { PlusSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Num } from '@/components/Format'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/checkbox'
import { Input, Select } from '@/components/ui/input'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { LOW_STOCK_THRESHOLD } from '../api'
import { parseNumber, variantLabel, type DraftErrors, type OptionDraft, type VariantDraft } from '../productForm'
import '../i18n'

interface VariantsTableProps {
  options: OptionDraft[]
  variants: VariantDraft[]
  onChange: (variants: VariantDraft[]) => void
  errors: DraftErrors
  /** Gallery pictures that can be a variant's picture (uploaded ones, in gallery order). */
  imageChoices: { id: string; label: string }[]
  /** Saved stock per variant id (server state; moves with ± only). */
  savedStock: Map<string, number>
  /** Opens the ± dialog for a saved variant; omitted = read-only stock. */
  onAdjustStock?: (variantId: string) => void
  readOnly?: boolean
}

/** One row per combination (§3.3.1): SKU, price*, offer, stock, picture, active. */
export function VariantsTable({ options, variants, onChange, errors, imageChoices, savedStock, onAdjustStock, readOnly }: VariantsTableProps) {
  const { t } = useTranslation('store')
  const { lang } = useLang()
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')

  const set = (index: number, patch: Partial<VariantDraft>) => onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  const err = (path: string) => (errors[path] ? t(`validation.${errors[path]}`) : undefined)
  const hasNew = variants.some((v) => !v.id)

  return (
    <div className="space-y-3">
      {!readOnly && variants.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-md bg-muted/50 p-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              dir="ltr"
              className="h-8 w-28"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              placeholder={t('variants.price')}
              aria-label={t('variants.samePrice')}
            />
            <Button size="xs" variant="outline" disabled={!(parseNumber(bulkPrice) > 0)} onClick={() => onChange(variants.map((v) => ({ ...v, price: bulkPrice })))}>
              {t('variants.samePrice')}
            </Button>
          </div>
          {hasNew && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                dir="ltr"
                className="h-8 w-20"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                placeholder={t('variants.stock')}
                aria-label={t('variants.sameStock')}
              />
              <Button
                size="xs"
                variant="outline"
                disabled={!Number.isInteger(parseNumber(bulkStock)) || parseNumber(bulkStock) < 0}
                onClick={() => onChange(variants.map((v) => (v.id ? v : { ...v, stockQuantity: bulkStock })))}
              >
                {t('variants.sameStock')}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <THead>
            <Tr>
              <Th>{t('variants.combination')}</Th>
              <Th>{t('variants.sku')}</Th>
              <Th>
                {t('variants.price')} <span className="text-destructive">*</span>
              </Th>
              <Th>{t('variants.compareAtPrice')}</Th>
              <Th>{t('variants.stock')}</Th>
              <Th>{t('variants.image')}</Th>
              <Th>{t('variants.active')}</Th>
            </Tr>
          </THead>
          <TBody>
            {variants.map((v, i) => {
              const stock = v.id ? savedStock.get(v.id) : undefined
              const rowError = err(`variants.${i}.price`) || err(`variants.${i}.compareAtPrice`) || err(`variants.${i}.stockQuantity`) || err(`variants.${i}.sku`)
              return (
                <Tr key={v.id ?? Object.values(v.combo).join('|')} className={cn(!v.isActive && 'opacity-60')}>
                  <Td className="min-w-[8rem] font-medium">
                    {variantLabel(options, v.combo, lang)}
                    {rowError && (
                      <p className="mt-1 text-xs font-normal text-destructive" role="alert">
                        {rowError}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Input
                      dir="ltr"
                      className="h-8 w-28 font-mono text-xs"
                      value={v.sku}
                      readOnly={readOnly}
                      maxLength={60}
                      placeholder={t('variants.skuAuto')}
                      aria-label={t('variants.sku')}
                      aria-invalid={!!errors[`variants.${i}.sku`]}
                      onChange={(e) => set(i, { sku: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      dir="ltr"
                      className="h-8 w-20"
                      value={v.price}
                      readOnly={readOnly}
                      aria-label={t('variants.price')}
                      aria-invalid={!!errors[`variants.${i}.price`]}
                      onChange={(e) => set(i, { price: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      dir="ltr"
                      className="h-8 w-20"
                      value={v.compareAtPrice}
                      readOnly={readOnly}
                      placeholder="—"
                      aria-label={t('variants.compareAtPrice')}
                      aria-invalid={!!errors[`variants.${i}.compareAtPrice`]}
                      onChange={(e) => set(i, { compareAtPrice: e.target.value })}
                    />
                  </Td>
                  <Td>
                    {v.id ? (
                      <span className="inline-flex items-center gap-1">
                        <Num value={stock ?? 0} className={cn('font-medium', (stock ?? 0) <= LOW_STOCK_THRESHOLD && 'text-tone-danger')} />
                        {onAdjustStock && (
                          <Button variant="ghost" size="icon-sm" aria-label={t('variants.adjustStock')} title={t('variants.adjustStock')} onClick={() => onAdjustStock(v.id!)}>
                            <PlusSquare />
                          </Button>
                        )}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        dir="ltr"
                        className="h-8 w-20"
                        value={v.stockQuantity}
                        readOnly={readOnly}
                        aria-label={t('variants.stock')}
                        aria-invalid={!!errors[`variants.${i}.stockQuantity`]}
                        onChange={(e) => set(i, { stockQuantity: e.target.value })}
                      />
                    )}
                  </Td>
                  <Td>
                    <Select
                      className="h-8 w-24 text-xs"
                      value={v.imageId ?? ''}
                      disabled={readOnly}
                      aria-label={t('variants.image')}
                      onChange={(e) => set(i, { imageId: e.target.value || null })}
                    >
                      <option value="">{t('variants.noImage')}</option>
                      {imageChoices.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <Switch checked={v.isActive} disabled={readOnly} onCheckedChange={(isActive) => set(i, { isActive })} aria-label={t('variants.active')} />
                  </Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t('variants.hint')}</p>
    </div>
  )
}
