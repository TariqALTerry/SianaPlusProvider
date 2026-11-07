import { Crosshair, MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { qk } from '@/api/keys'
import { useTranslation } from 'react-i18next'
import { toApiError } from '@/api/http'
import type { ProviderBranchResponse, SaveProviderBranchRequest } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { CityInput } from '@/components/CityInput'
import { FileUpload } from '@/components/FileUpload'
import { LazyPointPicker } from '@/components/map/LazyMap'
import { useErrorMessage } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { useSubscriptionOverview } from '@/features/subscription/api'
import { BRANCH_INVALIDATION, branchesApi } from '../api'
import { BRANCH_LIMITS, branchDraft, branchFieldForError, branchRequest, EMPTY_BRANCH, validateBranch, type BranchDraft, type BranchErrors } from '../logic'
import '../i18n'

interface BranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this branch; omit to create one. */
  branch?: ProviderBranchResponse | null
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-semibold">
        {title}
        {note && <span className="ms-2 text-xs font-normal text-muted-foreground">{note}</span>}
      </legend>
      {children}
    </fieldset>
  )
}

function SwitchRow({ id, label, hint, checked, onChange, disabled }: { id: string; label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
    </div>
  )
}

/**
 * Add or edit a branch (owner only, phase 1 §3): a full replace of `SaveProviderBranchRequest`. The counter switch needs
 * the platform override or a live subscription; the server keeps the counter-branch limit (`CounterBranchLimitReached`).
 */
export function BranchDialog({ open, onOpenChange, branch }: BranchDialogProps) {
  const { t } = useTranslation('branches')
  const { org } = useProvider()
  const uid = useId()
  const id = (k: string) => `${uid}-${k}`
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_BRANCH)
  const [tried, setTried] = useState(false)
  const [current, setCurrent] = useState<ProviderBranchResponse | null>(null)
  const serverMessage = useErrorMessage()
  const queryClient = useQueryClient()
  const overview = useSubscriptionOverview(open)

  const save = useAction<SaveProviderBranchRequest, ProviderBranchResponse>({
    mutationFn: (body) => (branch ? branchesApi.update(branch.id, body) : branchesApi.create(body)),
    invalidate: BRANCH_INVALIDATION,
    success: branch ? t('form.saved') : t('form.created'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = save

  useEffect(() => {
    if (!open) return
    setDraft(branch ? branchDraft(branch) : EMPTY_BRANCH)
    setCurrent(branch ?? null)
    setTried(false)
    reset()
  }, [open, branch, reset])

  const errors: BranchErrors = validateBranch(draft)
  const errorCode = save.error ? toApiError(save.error).errorCode : null
  const serverField = branchFieldForError(errorCode)
  const show = (k: keyof BranchDraft): string | undefined =>
    serverField === k ? serverMessage(save.error) : tried && errors[k] ? t(`errors.${errors[k]}`) : undefined
  const patch = (p: Partial<BranchDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    if (serverField && serverField in p) reset()
  }

  // The counter may be switched on with the platform override or a live subscription; an existing "on" may always go off.
  const counterAllowed = org.counterModuleEnabled || !!overview.data?.subscription?.isLive || !!overview.data?.counterAvailable
  const counterLocked = !counterAllowed && !draft.counterEnabled
  const limit = overview.data?.counterBranchesAllowed

  const locate = () =>
    navigator.geolocation?.getCurrentPosition((pos) => patch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), undefined, { timeout: 10_000 })

  const fallback = org.baseLatitude !== null && org.baseLongitude !== null ? { lat: org.baseLatitude, lng: org.baseLongitude } : null

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={branch ? t('form.editTitle') : t('form.createTitle')}
      target={branch ? `${branch.name} · ${branch.code}` : undefined}
      confirmLabel={branch ? t('form.save') : t('form.create')}
      submitting={save.isPending}
      error={serverField ? null : save.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) save.mutate(branchRequest(draft))
      }}
    >
      {errorCode === 'CounterBranchLimitReached' && (
        <p className="text-sm">
          <Link to="/subscription" className="font-medium text-primary underline" onClick={() => onOpenChange(false)}>
            {t('active.limitCta')}
          </Link>
        </p>
      )}

      <Section title={t('form.basics')}>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label={t('form.name')} htmlFor={id('name')} required error={show('name')}>
            <Input id={id('name')} value={draft.name} maxLength={BRANCH_LIMITS.name} onChange={(e) => patch({ name: e.target.value })} aria-invalid={!!show('name') || undefined} autoFocus />
          </Field>
          <Field label={t('form.code')} htmlFor={id('code')} required error={show('code')}>
            <Input
              id={id('code')}
              dir="ltr"
              value={draft.code}
              maxLength={6}
              onChange={(e) => patch({ code: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })}
              className="font-latin uppercase tracking-wider"
              aria-invalid={!!show('code') || undefined}
            />
          </Field>
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">{t('form.codeHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('form.phone')} htmlFor={id('phone')} optional error={show('phone')}>
            <Input id={id('phone')} type="tel" dir="ltr" value={draft.phone} maxLength={BRANCH_LIMITS.phone} onChange={(e) => patch({ phone: e.target.value })} className="font-latin" />
          </Field>
          <Field label={t('form.whatsApp')} htmlFor={id('wa')} optional error={show('whatsAppNumber')}>
            <Input id={id('wa')} type="tel" dir="ltr" value={draft.whatsAppNumber} maxLength={BRANCH_LIMITS.phone} onChange={(e) => patch({ whatsAppNumber: e.target.value })} className="font-latin" />
          </Field>
          <Field label={t('form.city')} htmlFor={id('city')} optional error={show('city')}>
            <CityInput id={id('city')} value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
          </Field>
          <Field label={t('form.district')} htmlFor={id('district')} optional error={show('district')}>
            <Input id={id('district')} value={draft.district} maxLength={BRANCH_LIMITS.field} onChange={(e) => patch({ district: e.target.value })} />
          </Field>
        </div>
        <Field label={t('form.addressLine')} htmlFor={id('address')} optional error={show('addressLine')}>
          <Input id={id('address')} value={draft.addressLine} maxLength={BRANCH_LIMITS.field} onChange={(e) => patch({ addressLine: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t('form.location')}</p>
              <p className="text-xs text-muted-foreground">{t('form.locationHint')}</p>
            </div>
            <div className="flex gap-1">
              {'geolocation' in navigator && (
                <Button size="xs" variant="outline" onClick={locate}>
                  <Crosshair /> {t('form.myLocation')}
                </Button>
              )}
              {draft.latitude !== null && (
                <Button size="xs" variant="ghost" onClick={() => patch({ latitude: null, longitude: null })}>
                  <MapPinOff /> {t('form.clearLocation')}
                </Button>
              )}
            </div>
          </div>
          {open && <LazyPointPicker lat={draft.latitude} lng={draft.longitude} fallback={fallback} onPick={(p) => patch({ latitude: p.lat, longitude: p.lng })} />}
          <p className="ltr-nums text-xs text-muted-foreground" dir="ltr">
            {draft.latitude !== null && draft.longitude !== null ? `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}` : t('form.noLocation')}
          </p>
        </div>
      </Section>

      <Section title={t('form.platform')}>
        <SwitchRow
          id={id('platform')}
          label={t('form.receivesPlatformDevices')}
          hint={t('form.receivesPlatformDevicesHint')}
          checked={draft.receivesPlatformDevices}
          onChange={(v) => patch({ receivesPlatformDevices: v })}
        />
      </Section>

      <Section title={t('form.counter')}>
        <SwitchRow
          id={id('counter')}
          label={t('form.counterEnabled')}
          hint={counterLocked ? t('form.counterModuleOff') : t('form.counterEnabledHint')}
          checked={draft.counterEnabled}
          onChange={(v) => patch({ counterEnabled: v })}
          disabled={counterLocked}
        />
        {limit !== null && limit !== undefined && overview.data && (
          <p className="text-xs text-muted-foreground">{t('form.counterLimitHint', { used: overview.data.counterBranchesUsed, allowed: limit })}</p>
        )}
        <SwitchRow
          id={id('wa-auto')}
          label={t('form.autoSendWhatsApp')}
          hint={current && !current.whatsAppGlobalEnabled ? <span className="text-tone-attention">{t('form.whatsAppGlobalOff')}</span> : t('form.autoSendWhatsAppHint')}
          checked={draft.autoSendWhatsApp}
          onChange={(v) => patch({ autoSendWhatsApp: v })}
        />
        <SwitchRow
          id={id('scan')}
          label={t('form.allowScanToClaim')}
          checked={draft.allowScanToClaim}
          onChange={(v) => patch({ allowScanToClaim: v })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('form.abandonAfterDays')} htmlFor={id('abandon')} optional hint={current ? `${t('form.abandonHint')} ${t('form.effectiveAbandon', { days: current.effectiveAbandonAfterDays })}` : t('form.abandonHint')} error={show('abandonAfterDays')}>
            <Input id={id('abandon')} type="number" inputMode="numeric" min={30} max={365} dir="ltr" value={draft.abandonAfterDays} onChange={(e) => patch({ abandonAfterDays: e.target.value })} className="tabular" />
          </Field>
          <Field label={t('form.storageFeePerDay')} htmlFor={id('fee')} optional hint={t('form.storageFeeHint')} error={show('storageFeePerDay')}>
            <Input id={id('fee')} type="number" inputMode="decimal" min={0} max={20} step="0.5" dir="ltr" value={draft.storageFeePerDay} onChange={(e) => patch({ storageFeePerDay: e.target.value })} className="tabular" />
          </Field>
          <Field label={t('form.freeStorageDays')} htmlFor={id('free')} optional hint={t('form.freeStorageHint')} error={show('freeStorageDays')}>
            <Input id={id('free')} type="number" inputMode="numeric" min={3} max={90} dir="ltr" value={draft.freeStorageDays} onChange={(e) => patch({ freeStorageDays: e.target.value })} className="tabular" />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{t('form.storageTermsNote')}</p>
      </Section>

      <Section title={t('form.receipt')} note={current?.termsVersion ? t('tab.termsVersion', { version: current.termsVersion }) : undefined}>
        <Field label={t('form.termsText')} htmlFor={id('terms')} optional hint={t('form.termsHint')} error={show('termsText')}>
          <Textarea id={id('terms')} rows={5} dir="auto" value={draft.termsText} maxLength={BRANCH_LIMITS.terms} onChange={(e) => patch({ termsText: e.target.value })} />
        </Field>
        <Field label={t('form.receiptFooter')} htmlFor={id('footer')} optional error={show('receiptFooter')}>
          <Textarea id={id('footer')} rows={2} dir="auto" value={draft.receiptFooter} maxLength={BRANCH_LIMITS.footer} onChange={(e) => patch({ receiptFooter: e.target.value })} />
        </Field>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('form.receiptLogo')}</p>
          {current ? (
            <FileUpload
              currentUrl={current.receiptLogoUrl}
              onUpload={async (file) => {
                const updated = await branchesApi.uploadReceiptLogo(current.id, file)
                setCurrent(updated)
                toast.success(t('form.logoSaved'))
                void queryClient.invalidateQueries({ queryKey: qk.branches })
              }}
            />
          ) : (
            <p className="text-xs text-muted-foreground">{t('form.logoAfterCreate')}</p>
          )}
          <p className="text-xs text-muted-foreground">{t('form.receiptLogoHint')}</p>
        </div>
      </Section>
    </ActionDialog>
  )
}
