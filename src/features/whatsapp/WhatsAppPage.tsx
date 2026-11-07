import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FlaskConical, Link2Off, ShieldAlert, XCircle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import type { ProviderWhatsAppResponse, WhatsAppBranchResponse } from '@/api/types'
import { ActionDialog, ConfirmDialog } from '@/components/ActionDialog'
import { CopyButton } from '@/components/CopyButton'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, InlineError, PageSkeleton } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { CheckboxField, Switch } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useIsOwner } from '@/features/auth/authStore'
import { branchesApi } from '@/features/branches/api'
import { branchDraft, branchRequest } from '@/features/branches/logic'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { whatsappApi, whatsappKeys, useWhatsAppSettings } from './api'
import { changesVerification, linkDraft, linkProblems, linkRequest, REQUIRED_TEMPLATES, senderLabel, type LinkDraft } from './logic'
import './i18n'

/**
 * `/settings/whatsapp` (phase 4 §5): which number sends the counter's automatic messages, this month's quota, the
 * per-branch switch, and the shop's own number (link, test, unlink). Writes are the owner's; tokens never come back.
 */
export function WhatsAppPage() {
  const { t } = useTranslation('whatsapp')
  const query = useWhatsAppSettings()
  if (query.isPending) return <PageSkeleton />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const s = query.data
  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      {!s.globalEnabled && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-tone-danger/30 bg-tone-danger-soft px-4 py-3 text-sm font-medium text-tone-danger">
          <ShieldAlert className="size-4 shrink-0" aria-hidden /> {t('globalOff')}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <StatusCard s={s} />
          <LinkCard s={s} />
        </div>
        <aside className="min-w-0 space-y-4">
          <BranchesCard s={s} />
          <GuideCard s={s} />
        </aside>
      </div>
    </>
  )
}

function StatusCard({ s }: { s: ProviderWhatsAppResponse }) {
  const { t } = useTranslation('whatsapp')
  const sender = senderLabel(s)
  const over = s.activeSender === 'Platform' && !s.quotaUnlimited && s.quotaUsed >= s.quotaAllowed
  const pct = s.quotaUnlimited || s.quotaAllowed <= 0 ? 0 : Math.min(100, Math.round((s.quotaUsed / s.quotaAllowed) * 100))
  return (
    <Card>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">{t('status.title')}</p>
          <p className={cn('mt-1 text-lg font-semibold', sender === 'none' && 'text-tone-attention')}>
            {sender === 'provider' ? (
              <>
                {t('status.provider')}
                {s.displayPhoneNumber && (
                  <bdi className="ltr-nums ms-2 font-latin text-sm font-normal text-muted-foreground">{s.displayPhoneNumber}</bdi>
                )}
              </>
            ) : sender === 'platform' ? (
              s.platformDisplayPhone ? t('status.platformPhone', { phone: s.platformDisplayPhone }) : t('status.platform')
            ) : (
              t('status.none')
            )}
          </p>
          {sender === 'none' && <p className="text-xs text-muted-foreground">{t('status.noneHint')}</p>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('quota.title')}</p>
          <p className="tabular mt-1 text-lg font-semibold">{s.quotaUnlimited ? t('quota.unlimited') : t('quota.used', { used: s.quotaUsed, allowed: s.quotaAllowed })}</p>
          {!s.quotaUnlimited && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn('h-full rounded-full', over ? 'bg-tone-danger' : pct >= 80 ? 'bg-tone-attention' : 'bg-primary')} style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className={cn('mt-1 text-xs', over ? 'text-tone-danger' : 'text-muted-foreground')}>{over ? t('quota.over') : t('quota.hint')}</p>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * The per-branch switch saves through the branch's full replace (`PUT api/provider/branches/{id}`): read the branch,
 * change `autoSendWhatsApp`, send everything back, then read the WhatsApp page again.
 */
function BranchesCard({ s }: { s: ProviderWhatsAppResponse }) {
  const { t } = useTranslation('whatsapp')
  const isOwner = useIsOwner()
  const toggle = useAction({
    mutationFn: async ({ branch, on }: { branch: WhatsAppBranchResponse; on: boolean }) => {
      const current = await branchesApi.get(branch.branchId)
      return branchesApi.update(branch.branchId, { ...branchRequest(branchDraft(current)), autoSendWhatsApp: on })
    },
    invalidate: [qk.whatsapp, qk.branches, qk.counter],
    success: t('branches.saved'),
    errorToast: true,
  })
  return (
    <Card>
      <CardHeader title={t('branches.title')} description={isOwner ? t('branches.hint') : `${t('branches.hint')} ${t('branches.ownerOnly')}`} />
      <CardBody>
        {s.branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('branches.empty')}</p>
        ) : (
          <ul className="divide-y">
            {s.branches.map((b) => {
              const busy = toggle.isPending && toggle.variables?.branch.branchId === b.branchId
              return (
                <li key={b.branchId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{b.name}</span>
                    {!b.counterEnabled && <span className="block text-xs text-muted-foreground">{t('branches.counterOff')}</span>}
                  </span>
                  <Switch
                    checked={b.autoSendWhatsApp}
                    disabled={!isOwner || busy}
                    onCheckedChange={(on) => toggle.mutate({ branch: b, on })}
                    aria-label={b.name}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function LinkCard({ s }: { s: ProviderWhatsAppResponse }) {
  const { t } = useTranslation('whatsapp')
  const { lang } = useLang()
  const uid = useId()
  const isOwner = useIsOwner()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<LinkDraft>(() => linkDraft(s))
  const [tried, setTried] = useState(false)
  const [dialog, setDialog] = useState<'test' | 'unlink' | null>(null)
  const patch = (p: Partial<LinkDraft>) => setDraft((d) => ({ ...d, ...p }))

  // A fresh read (after save / test / unlink) resets the form; secrets are never filled back.
  useEffect(() => setDraft(linkDraft(s)), [s])

  const problems = linkProblems(draft, s.linked)
  const show = (k: (typeof problems)[number]) => (tried && problems.includes(k) ? t(`link.errors.${k}`) : undefined)
  const put = (data: ProviderWhatsAppResponse) => queryClient.setQueryData(whatsappKeys.settings(), data)

  const save = useAction({
    mutationFn: () => whatsappApi.save(linkRequest(draft)),
    invalidate: [qk.counter],
    success: t('link.saved'),
    onSuccess: put,
  })

  const submit = () => {
    setTried(true)
    if (problems.length === 0) save.mutate()
  }

  return (
    <Card>
      <CardHeader
        title={t('link.title')}
        description={t('link.hint')}
        actions={
          <span className="flex flex-wrap gap-1.5">
            <Badge tone={s.linked ? 'success' : 'neutral'}>{s.linked ? t('link.linked') : t('link.notLinked')}</Badge>
            {s.linked && (s.verified ? <Badge tone="success">{t('link.verified', { date: formatDateTime(s.verifiedAt, lang) })}</Badge> : <Badge tone="attention">{t('link.needsTest')}</Badge>)}
            {s.disabledByAdmin && <Badge tone="danger">{t('link.disabledByAdmin')}</Badge>}
          </span>
        }
      />
      <CardBody className="space-y-4">
        {s.disabledByAdmin && (
          <p className="rounded-lg bg-tone-danger-soft px-3 py-2 text-sm text-tone-danger">
            {t('link.disabledByAdmin')}
            {s.adminNote && <span className="block text-xs">{s.adminNote}</span>}
          </p>
        )}
        {!isOwner && <p className="text-xs text-muted-foreground">{t('link.ownerOnly')}</p>}
        {s.linked && s.displayPhoneNumber && (
          <p className="text-sm">
            <span className="text-muted-foreground">{t('link.displayPhone')}: </span>
            <bdi className="ltr-nums font-latin">{s.displayPhoneNumber}</bdi>
          </p>
        )}

        <fieldset disabled={!isOwner} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('link.phoneNumberId')} htmlFor={`${uid}-pid`} error={show('phoneNumberId')}>
              <Input id={`${uid}-pid`} dir="ltr" inputMode="numeric" autoComplete="off" className="font-latin" value={draft.phoneNumberId} maxLength={64} onChange={(e) => patch({ phoneNumberId: e.target.value })} />
            </Field>
            <Field label={t('link.wabaId')} htmlFor={`${uid}-waba`} error={show('wabaId')}>
              <Input id={`${uid}-waba`} dir="ltr" inputMode="numeric" autoComplete="off" className="font-latin" value={draft.wabaId} maxLength={64} onChange={(e) => patch({ wabaId: e.target.value })} />
            </Field>
            <Field
              label={t('link.accessToken')}
              htmlFor={`${uid}-token`}
              optional={s.linked}
              hint={s.accessTokenMasked ? t('link.accessTokenSaved', { masked: s.accessTokenMasked }) : t('link.accessTokenHint')}
              error={show('accessToken')}
            >
              <Input id={`${uid}-token`} type="password" dir="ltr" autoComplete="new-password" value={draft.accessToken} maxLength={1000} onChange={(e) => patch({ accessToken: e.target.value })} />
            </Field>
            <Field label={t('link.appSecret')} htmlFor={`${uid}-secret`} optional hint={s.hasAppSecret ? t('link.appSecretSaved') : undefined}>
              <Input
                id={`${uid}-secret`}
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={draft.appSecret}
                maxLength={200}
                disabled={draft.clearAppSecret}
                onChange={(e) => patch({ appSecret: e.target.value })}
              />
            </Field>
            <Field label={t('link.language')} htmlFor={`${uid}-lang`} hint={t('link.languageHint')} error={show('language')}>
              <Input id={`${uid}-lang`} dir="ltr" className="font-latin" value={draft.language} maxLength={10} onChange={(e) => patch({ language: e.target.value })} />
            </Field>
          </div>
          {s.hasAppSecret && <CheckboxField id={`${uid}-clear`} checked={draft.clearAppSecret} onCheckedChange={(v) => patch({ clearAppSecret: v })} label={t('link.clearAppSecret')} />}
          <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <label htmlFor={`${uid}-enabled`} className="cursor-pointer text-sm font-medium">
                {t('link.enabled')}
              </label>
              <p className="text-xs text-muted-foreground">{t('link.enabledHint')}</p>
            </div>
            <Switch id={`${uid}-enabled`} checked={draft.enabled} disabled={s.disabledByAdmin && !draft.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          </div>
          {s.linked && changesVerification(draft, s) && <p className="text-xs text-tone-attention">{t('link.willNeedTest')}</p>}
        </fieldset>

        <InlineError error={save.error} />

        {s.lastTestAt && (
          <div className={cn('rounded-lg px-3 py-2 text-sm', s.lastTestSucceeded ? 'bg-tone-success-soft text-tone-success' : 'bg-tone-danger-soft text-tone-danger')}>
            <p className="flex items-center gap-2 font-medium">
              {s.lastTestSucceeded ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
              {s.lastTestSucceeded ? t('link.testOk') : t('link.testFailed')} · {t('link.lastTest', { date: formatDateTime(s.lastTestAt, lang) })}
            </p>
            {!s.lastTestSucceeded && s.lastTestError && (
              <p className="mt-1 break-words text-xs" dir="auto">
                {s.lastTestError}
              </p>
            )}
          </div>
        )}

        {isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={submit} loading={save.isPending}>
              {t('link.save')}
            </Button>
            {s.linked && (
              <Button size="lg" variant="outline" onClick={() => setDialog('test')}>
                <FlaskConical /> {t('link.test')}
              </Button>
            )}
            {s.linked && (
              <Button size="lg" variant="ghost" className="text-destructive" onClick={() => setDialog('unlink')}>
                <Link2Off /> {t('link.unlink')}
              </Button>
            )}
          </div>
        )}
      </CardBody>
      {isOwner && <TestDialog open={dialog === 'test'} onOpenChange={(o) => !o && setDialog(null)} onDone={put} />}
      {isOwner && <UnlinkDialog open={dialog === 'unlink'} onOpenChange={(o) => !o && setDialog(null)} onDone={put} />}
    </Card>
  )
}

/** "اختبار": reads the number from Meta, sends `hello_world`. A failure comes back in the reply, not as an error. */
function TestDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (s: ProviderWhatsAppResponse) => void }) {
  const { t } = useTranslation('whatsapp')
  const uid = useId()
  const [toPhone, setToPhone] = useState('')
  const action = useAction({
    mutationFn: () => whatsappApi.test({ toPhone: toPhone.trim() || null }),
    invalidate: [qk.counter],
    success: (r: ProviderWhatsAppResponse) => (r.lastTestSucceeded ? t('link.testOk') : t('link.testFailed')),
    onSuccess: (r: ProviderWhatsAppResponse) => {
      onDone(r)
      onOpenChange(false)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setToPhone('')
      reset()
    }
  }, [open, reset])
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('link.testTitle')}
      description={t('link.testHint')}
      confirmLabel={t('link.test')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => action.mutate()}
    >
      <Field label={t('link.toPhone')} htmlFor={`${uid}-to`} optional>
        <Input id={`${uid}-to`} type="tel" dir="ltr" className="font-latin" value={toPhone} maxLength={30} onChange={(e) => setToPhone(e.target.value)} placeholder="+9665XXXXXXXX" />
      </Field>
    </ActionDialog>
  )
}

function UnlinkDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (s: ProviderWhatsAppResponse) => void }) {
  const { t } = useTranslation('whatsapp')
  const action = useAction({
    mutationFn: () => whatsappApi.unlink(),
    invalidate: [qk.counter],
    success: t('link.unlinked'),
    onSuccess: (r: ProviderWhatsAppResponse) => {
      onDone(r)
      onOpenChange(false)
    },
  })
  const { reset } = action
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('link.unlinkTitle')}
      description={t('link.unlinkHint')}
      confirmLabel={t('link.unlink')}
      destructive
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => action.mutate()}
    />
  )
}

/** The fixed guide: template names, and the webhook URL / verify token (the token is the owner's only, null otherwise). */
function GuideCard({ s }: { s: ProviderWhatsAppResponse }) {
  const { t } = useTranslation('whatsapp')
  return (
    <Card>
      <CardHeader title={t('guide.title')} />
      <CardBody className="space-y-3 text-sm">
        <p>{t('guide.templates')}</p>
        <ul className="flex flex-wrap gap-1.5" dir="ltr">
          {REQUIRED_TEMPLATES.map((name) => (
            <li key={name} className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-xs">
              {name}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{t('guide.webhook')}</p>
        {s.webhookUrl && (
          <div>
            <p className="text-xs text-muted-foreground">{t('guide.webhookUrl')}</p>
            <p className="flex items-center gap-1" dir="ltr">
              <span className="truncate font-mono text-xs">{s.webhookUrl}</span>
              <CopyButton value={s.webhookUrl} />
            </p>
          </div>
        )}
        {s.webhookVerifyToken && (
          <div>
            <p className="text-xs text-muted-foreground">{t('guide.verifyToken')}</p>
            <p className="flex items-center gap-1" dir="ltr">
              <span className="truncate font-mono text-xs">{s.webhookVerifyToken}</span>
              <CopyButton value={s.webhookVerifyToken} />
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
