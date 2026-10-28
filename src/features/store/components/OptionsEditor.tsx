import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { StoreOptionKindValues, type StoreOptionKind } from '@/api/types'
import { useLang } from '@/hooks/useLang'
import { enumLabel } from '@/i18n/enums'
import { cn } from '@/lib/utils'
import { DEFAULT_COLOR, keyFromName, LIMITS, uid, type DraftErrors, type OptionDraft, type OptionValueDraft } from '../productForm'
import '../i18n'

interface OptionsEditorProps {
  options: OptionDraft[]
  onChange: (options: OptionDraft[]) => void
  errors: DraftErrors
  readOnly?: boolean
}

/** Up to 3 option axes (colour, size, other), each with 2–20 values (§3.3.1). */
export function OptionsEditor({ options, onChange, errors, readOnly }: OptionsEditorProps) {
  const { t } = useTranslation('store')
  const { lang } = useLang()
  const err = (path: string) => (errors[path] ? t(`validation.${errors[path]}`, { max: LIMITS.optionValuesMax, min: LIMITS.optionValuesMin }) : undefined)

  const setOption = (uidValue: string, patch: Partial<OptionDraft>) => onChange(options.map((o) => (o.uid === uidValue ? { ...o, ...patch } : o)))
  const setValue = (option: OptionDraft, valueUid: string, patch: Partial<OptionValueDraft>) =>
    setOption(option.uid, {
      values: option.values.map((v) => {
        if (v.uid !== valueUid) return v
        const next = { ...v, ...patch }
        // The key follows the English name until someone types a key of their own.
        if (patch.valueEn !== undefined && !v.keyTouched) next.key = keyFromName(patch.valueEn)
        return next
      }),
    })

  const addValue = (option: OptionDraft) =>
    setOption(option.uid, {
      values: [...option.values, { uid: uid('v'), key: '', keyTouched: false, valueAr: '', valueEn: '', colorHex: option.kind === 'Color' ? DEFAULT_COLOR : '' }],
    })

  const addOption = () => {
    const kind: StoreOptionKind = options.some((o) => o.kind === 'Color') ? (options.some((o) => o.kind === 'Size') ? 'Other' : 'Size') : 'Color'
    const names: Record<StoreOptionKind, [string, string]> = { Color: ['اللون', 'Colour'], Size: ['المقاس', 'Size'], Other: ['', ''] }
    const blank = (): OptionValueDraft => ({ uid: uid('v'), key: '', keyTouched: false, valueAr: '', valueEn: '', colorHex: kind === 'Color' ? DEFAULT_COLOR : '' })
    onChange([...options, { uid: uid('o'), kind, nameAr: names[kind][0], nameEn: names[kind][1], values: [blank(), blank()] }])
  }

  return (
    <div className="space-y-3">
      {options.length === 0 && <p className="text-sm text-muted-foreground">{t('options.none')}</p>}
      {options.map((option, index) => (
        <fieldset key={option.uid} className="space-y-3 rounded-lg border p-3">
          <legend className="sr-only">{t('options.option', { n: index + 1 })}</legend>
          <div className="grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]">
            <Field label={t('options.kind')} htmlFor={`${option.uid}-kind`}>
              <Select
                id={`${option.uid}-kind`}
                value={option.kind}
                disabled={readOnly}
                onChange={(e) => {
                  const kind = e.target.value as StoreOptionKind
                  setOption(option.uid, { kind, values: option.values.map((v) => ({ ...v, colorHex: kind === 'Color' ? v.colorHex || DEFAULT_COLOR : v.colorHex })) })
                }}
              >
                {StoreOptionKindValues.map((k) => (
                  <option key={k} value={k}>
                    {enumLabel('StoreOptionKind', k, lang)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('options.nameAr')} htmlFor={`${option.uid}-ar`} required error={err(`options.${option.uid}.nameAr`)}>
              <Input id={`${option.uid}-ar`} dir="rtl" value={option.nameAr} readOnly={readOnly} maxLength={60} onChange={(e) => setOption(option.uid, { nameAr: e.target.value })} />
            </Field>
            <Field label={t('options.nameEn')} htmlFor={`${option.uid}-en`} required error={err(`options.${option.uid}.nameEn`)}>
              <Input id={`${option.uid}-en`} dir="ltr" value={option.nameEn} readOnly={readOnly} maxLength={60} onChange={(e) => setOption(option.uid, { nameEn: e.target.value })} />
            </Field>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="self-end text-destructive"
                aria-label={t('options.removeOption')}
                onClick={() => onChange(options.filter((o) => o.uid !== option.uid))}
              >
                <Trash2 />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_1fr_9rem_auto_auto] gap-2 px-0.5 text-xs text-muted-foreground sm:grid">
              <span>{t('options.valueAr')}</span>
              <span>{t('options.valueEn')}</span>
              <span>{t('options.key')}</span>
              <span className={cn(option.kind !== 'Color' && 'invisible')}>{t('options.color')}</span>
              <span className="w-8" />
            </div>
            {option.values.map((v) => {
              const keyError = err(`values.${v.uid}.key`)
              const rowError = err(`values.${v.uid}.valueAr`) || err(`values.${v.uid}.valueEn`) || keyError || err(`values.${v.uid}.colorHex`)
              return (
                <div key={v.uid}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_9rem_auto_auto]">
                    <Input
                      dir="rtl"
                      value={v.valueAr}
                      readOnly={readOnly}
                      placeholder={option.kind === 'Color' ? 'أسود' : 'كبير'}
                      aria-label={t('options.valueAr')}
                      aria-invalid={!!errors[`values.${v.uid}.valueAr`]}
                      onChange={(e) => setValue(option, v.uid, { valueAr: e.target.value })}
                    />
                    <Input
                      dir="ltr"
                      value={v.valueEn}
                      readOnly={readOnly}
                      placeholder={option.kind === 'Color' ? 'Black' : 'Large'}
                      aria-label={t('options.valueEn')}
                      aria-invalid={!!errors[`values.${v.uid}.valueEn`]}
                      onChange={(e) => setValue(option, v.uid, { valueEn: e.target.value })}
                    />
                    <Input
                      dir="ltr"
                      className="font-mono text-xs"
                      value={v.key}
                      readOnly={readOnly}
                      maxLength={40}
                      aria-label={t('options.key')}
                      aria-invalid={!!keyError}
                      title={t('options.keyHint')}
                      onChange={(e) => setValue(option, v.uid, { key: e.target.value.toLowerCase(), keyTouched: true })}
                    />
                    {option.kind === 'Color' ? (
                      <input
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(v.colorHex) ? v.colorHex : DEFAULT_COLOR}
                        disabled={readOnly}
                        aria-label={t('options.color')}
                        onChange={(e) => setValue(option, v.uid, { colorHex: e.target.value.toUpperCase() })}
                        className="h-9 w-12 cursor-pointer rounded-md border bg-surface p-1"
                      />
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('options.removeValue')}
                        onClick={() => setOption(option.uid, { values: option.values.filter((x) => x.uid !== v.uid) })}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  {rowError && (
                    <p className="mt-1 text-xs text-destructive" role="alert">
                      {rowError}
                    </p>
                  )}
                </div>
              )
            })}
            {err(`options.${option.uid}.values`) && (
              <p className="text-xs text-destructive" role="alert">
                {err(`options.${option.uid}.values`)}
              </p>
            )}
            {!readOnly && option.values.length < LIMITS.optionValuesMax && (
              <Button variant="link" size="xs" onClick={() => addValue(option)}>
                <Plus /> {t('options.addValue')}
              </Button>
            )}
          </div>
        </fieldset>
      ))}
      {!readOnly && options.length < LIMITS.options && (
        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus /> {t('options.add')}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">{t('options.hint')}</p>
    </div>
  )
}
