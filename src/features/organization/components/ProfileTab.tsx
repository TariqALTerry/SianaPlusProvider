import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useEffect, useId, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toApiError } from '@/api/http'
import { qk } from '@/api/keys'
import type { ProviderOrganizationResponse, UpdateProviderProfileRequest } from '@/api/types'
import { CityInput } from '@/components/CityInput'
import { CopyButton } from '@/components/CopyButton'
import { FileUpload } from '@/components/FileUpload'
import { DateTime, Num, Percent } from '@/components/Format'
import { KeyValue } from '@/components/KeyValue'
import { Stars } from '@/components/Stars'
import { InlineError } from '@/components/States'
import { EnumText, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useProvider } from '@/app/provider'
import { useAction } from '@/hooks/useAction'
import { organizationApi } from '../api'

type FieldName = keyof FormValues

/** Server validation keys (§8.9 rules) → the field they belong to; the message is the server's. */
const FIELD_OF: Record<string, FieldName> = {
  LegalNameRequired: 'legalName',
  LegalNameTooLong: 'legalName',
  DisplayNameRequired: 'displayName',
  DisplayNameTooLong: 'displayName',
  PhoneRequired: 'phone',
  PhoneTooLong: 'phone',
  EmailInvalid: 'email',
  EmailTooLong: 'email',
  CityRequired: 'city',
  CityTooLong: 'city',
  AddressTooLong: 'address',
  DescriptionTooLong: 'description',
  CommercialRegistrationNumberTooLong: 'commercialRegistrationNumber',
  TaxNumberTooLong: 'taxNumber',
}

interface SchemaMessages {
  required: string
  maxLength: (max: number) => string
  email: string
}

function makeSchema(m: SchemaMessages) {
  const required = (max: number) => z.string().trim().min(1, m.required).max(max, m.maxLength(max))
  const optional = (max: number) => z.string().trim().max(max, m.maxLength(max))
  return z.object({
    legalName: required(200),
    displayName: required(200),
    phone: required(30),
    email: z.union([z.literal(''), z.string().trim().max(256, m.maxLength(256)).email(m.email)]),
    city: required(100),
    address: optional(500),
    description: optional(2000),
    commercialRegistrationNumber: optional(50),
    taxNumber: optional(50),
  })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

function toValues(org: ProviderOrganizationResponse): FormValues {
  return {
    legalName: org.legalName ?? '',
    displayName: org.displayName ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    city: org.city ?? '',
    address: org.address ?? '',
    description: org.description ?? '',
    commercialRegistrationNumber: org.commercialRegistrationNumber ?? '',
    taxNumber: org.taxNumber ?? '',
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null)

function toRequest(v: FormValues): UpdateProviderProfileRequest {
  return {
    legalName: v.legalName.trim(),
    displayName: v.displayName.trim(),
    phone: v.phone.trim(),
    email: orNull(v.email),
    city: v.city.trim(),
    address: orNull(v.address),
    description: orNull(v.description),
    commercialRegistrationNumber: orNull(v.commercialRegistrationNumber),
    taxNumber: orNull(v.taxNumber),
  }
}

/** الملف: the owner edits; supervisors read. Logo and facts for both. */
export function ProfileTab() {
  const { t } = useTranslation('organization')
  const { org, isOwner } = useProvider()

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">{isOwner ? <ProfileForm org={org} /> : <ProfileReadOnly org={org} />}</div>
      <div className="space-y-4">
        <LogoCard org={org} />
        <Card>
          <CardHeader title={t('profile.facts')} />
          <CardBody>
            <OrganizationFacts org={org} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function ProfileForm({ org }: { org: ProviderOrganizationResponse }) {
  const { t } = useTranslation('organization')
  const id = useId()
  const schema = useMemo(
    () =>
      makeSchema({
        required: t('common:validation.required'),
        maxLength: (max) => t('common:validation.maxLength', { max }),
        email: t('common:validation.email'),
      }),
    [t],
  )
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(org), mode: 'onTouched' })
  const { register, handleSubmit, formState, reset, setError } = form
  const errors = formState.errors

  // Pick up server changes (focus refetch, another tab) while the form is untouched.
  useEffect(() => {
    if (!formState.isDirty) reset(toValues(org))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

  const save = useAction<UpdateProviderProfileRequest, ProviderOrganizationResponse>({
    mutationFn: organizationApi.updateProfile,
    invalidate: [qk.organization],
    success: t('profile.saved'),
    onSuccess: (updated) => reset(toValues(updated)),
  })

  const onSubmit = handleSubmit((values) =>
    save.mutate(toRequest(values), {
      onError: (error) => {
        const e = toApiError(error)
        const field = e.errorCode ? FIELD_OF[e.errorCode] : undefined
        if (field) setError(field, { type: 'server', message: e.message })
      },
    }),
  )

  const serverError = save.error && !FIELD_OF[toApiError(save.error).errorCode ?? ''] ? save.error : null
  const f = (name: FieldName) => `${id}-${name}`

  return (
    <Card>
      <CardHeader title={t('profile.formTitle')} description={t('profile.formHint')} />
      <form onSubmit={onSubmit} noValidate>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.legalName')} htmlFor={f('legalName')} required hint={t('profile.legalNameHint')} error={errors.legalName?.message}>
            <Input id={f('legalName')} maxLength={200} autoComplete="organization" aria-invalid={!!errors.legalName} {...register('legalName')} />
          </Field>
          <Field label={t('profile.displayName')} htmlFor={f('displayName')} required hint={t('profile.displayNameHint')} error={errors.displayName?.message}>
            <Input id={f('displayName')} maxLength={200} aria-invalid={!!errors.displayName} {...register('displayName')} />
          </Field>
          <Field label={t('profile.phone')} htmlFor={f('phone')} required hint={t('profile.phoneHint')} error={errors.phone?.message}>
            <Input
              id={f('phone')}
              type="tel"
              dir="ltr"
              inputMode="tel"
              maxLength={30}
              autoComplete="tel"
              className="font-latin text-start tabular"
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
          </Field>
          <Field label={t('profile.email')} htmlFor={f('email')} optional error={errors.email?.message}>
            <Input id={f('email')} type="email" dir="ltr" maxLength={256} autoComplete="email" className="text-start" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label={t('profile.city')} htmlFor={f('city')} required error={errors.city?.message}>
            <CityInput id={f('city')} aria-invalid={!!errors.city} {...register('city')} />
          </Field>
          <Field label={t('profile.address')} htmlFor={f('address')} optional error={errors.address?.message}>
            <Input id={f('address')} maxLength={500} autoComplete="street-address" aria-invalid={!!errors.address} {...register('address')} />
          </Field>
          <Field label={t('profile.cr')} htmlFor={f('commercialRegistrationNumber')} optional error={errors.commercialRegistrationNumber?.message}>
            <Input
              id={f('commercialRegistrationNumber')}
              dir="ltr"
              maxLength={50}
              className="font-latin text-start tabular"
              aria-invalid={!!errors.commercialRegistrationNumber}
              {...register('commercialRegistrationNumber')}
            />
          </Field>
          <Field label={t('profile.tax')} htmlFor={f('taxNumber')} optional error={errors.taxNumber?.message}>
            <Input id={f('taxNumber')} dir="ltr" maxLength={50} className="font-latin text-start tabular" aria-invalid={!!errors.taxNumber} {...register('taxNumber')} />
          </Field>
          <Field label={t('profile.description')} htmlFor={f('description')} optional error={errors.description?.message} className="sm:col-span-2">
            <Textarea
              id={f('description')}
              rows={4}
              maxLength={2000}
              placeholder={t('profile.descriptionPlaceholder')}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
          </Field>
          {serverError && <InlineError error={serverError} className="sm:col-span-2" />}
        </CardBody>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
          {formState.isDirty && (
            <Button variant="ghost" onClick={() => reset(toValues(org))} disabled={save.isPending}>
              {t('common:actions.reset')}
            </Button>
          )}
          <Button type="submit" loading={save.isPending} disabled={!formState.isDirty}>
            {t('common:actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ProfileReadOnly({ org }: { org: ProviderOrganizationResponse }) {
  const { t } = useTranslation('organization')
  return (
    <Card>
      <CardHeader title={t('profile.formTitle')} />
      <CardBody className="space-y-4">
        <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" />
          {t('ownerOnlyNote')}
        </p>
        <KeyValue
          items={[
            { label: t('profile.legalName'), value: org.legalName },
            { label: t('profile.displayName'), value: org.displayName },
            { label: t('profile.phone'), value: org.phone ? <bdi className="font-latin tabular">{org.phone}</bdi> : null },
            { label: t('profile.email'), value: org.email ? <bdi>{org.email}</bdi> : null },
            { label: t('profile.city'), value: org.city },
            { label: t('profile.address'), value: org.address },
            { label: t('profile.cr'), value: org.commercialRegistrationNumber ? <bdi className="font-latin tabular">{org.commercialRegistrationNumber}</bdi> : null },
            { label: t('profile.tax'), value: org.taxNumber ? <bdi className="font-latin tabular">{org.taxNumber}</bdi> : null },
            { label: t('profile.description'), value: org.description ? <span className="whitespace-pre-line">{org.description}</span> : null, wide: true },
          ]}
        />
      </CardBody>
    </Card>
  )
}

function LogoCard({ org }: { org: ProviderOrganizationResponse }) {
  const { t } = useTranslation('organization')
  const upload = useAction<File, string>({
    mutationFn: organizationApi.uploadLogo,
    invalidate: [qk.organization],
    success: t('profile.logoSaved'),
  })
  return (
    <Card>
      <CardHeader title={t('profile.logo')} description={t('profile.logoHint')} />
      <CardBody>
        <FileUpload currentUrl={org.logoUrl} imagesOnly onUpload={(file) => upload.mutateAsync(file)} />
      </CardBody>
    </Card>
  )
}

function OrganizationFacts({ org }: { org: ProviderOrganizationResponse }) {
  const { t } = useTranslation('organization')
  return (
    <KeyValue
      columns={1}
      items={[
        {
          label: t('profile.tenantCode'),
          value: (
            <span className="inline-flex items-center gap-1">
              <bdi className="font-latin font-medium tabular">{org.tenantCode}</bdi>
              <CopyButton value={org.tenantCode} />
            </span>
          ),
        },
        { label: t('profile.type'), value: <EnumText enum="ProviderType" value={org.type} /> },
        { label: t('profile.status'), value: <StatusBadge enum="ProviderVerificationStatus" value={org.verificationStatus} /> },
        {
          label: t('profile.commission'),
          value: (
            <span className="inline-flex items-baseline gap-2">
              <Percent value={org.commissionRate} className="font-medium" />
              <span className="text-xs text-muted-foreground">{t('profile.commissionHint')}</span>
            </span>
          ),
        },
        {
          label: t('profile.rating'),
          value:
            org.ratingsCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Stars value={org.averageRating} />
                <span className="text-xs text-muted-foreground">{t('profile.ratingsCount', { count: org.ratingsCount })}</span>
              </span>
            ) : null,
        },
        { label: t('profile.completed'), value: <Num value={org.completedItemsCount} /> },
        { label: t('profile.team'), value: t('profile.teamValue', { members: org.membersCount, executors: org.executorsCount }) },
        { label: t('profile.memberSince'), value: <DateTime value={org.createdAt} mode="date" /> },
      ]}
    />
  )
}
