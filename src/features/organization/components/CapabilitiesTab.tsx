import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import { LOOKUP_STALE_TIME } from '@/api/queryClient'
import type { ProviderCapabilitiesResponse, PublicCapabilityResponse } from '@/api/types'
import { ConfirmDialog } from '@/components/ActionDialog'
import { EmptyState, ErrorState, InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/useAction'
import { useLang } from '@/hooks/useLang'
import { cn } from '@/lib/utils'
import { catalogKeys, organizationApi, organizationKeys } from '../api'
import { CAPABILITY_GROUPS, capabilityChanges, groupCapabilities } from '../logic'

/** القدرات (§8.9): grouped picker over the public catalog, saved as a full replace. */
export function CapabilitiesTab() {
  const { t } = useTranslation('organization')
  const catalog = useQuery({
    queryKey: catalogKeys.capabilities,
    queryFn: ({ signal }) => organizationApi.catalogCapabilities(signal),
    staleTime: LOOKUP_STALE_TIME,
  })
  const current = useQuery({
    queryKey: organizationKeys.capabilities,
    queryFn: ({ signal }) => organizationApi.capabilities(signal),
  })

  const body = (() => {
    if (catalog.isPending || current.isPending) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      )
    }
    if (catalog.isError || current.isError) {
      return (
        <ErrorState
          compact
          error={catalog.error ?? current.error}
          onRetry={() => {
            if (catalog.isError) void catalog.refetch()
            if (current.isError) void current.refetch()
          }}
        />
      )
    }
    if (catalog.data.length === 0) return <EmptyState title={t('capabilities.empty')} />
    // Remount (and so reset the selection) whenever the saved set changes.
    const key = current.data.capabilities
      .map((c) => c.id)
      .sort()
      .join(',')
    return <CapabilityPicker key={key} catalog={catalog.data} current={current.data} />
  })()

  return (
    <Card>
      <CardHeader title={t('capabilities.title')} description={t('capabilities.hint')} />
      {body}
    </Card>
  )
}

function CapabilityPicker({ catalog, current }: { catalog: PublicCapabilityResponse[]; current: ProviderCapabilitiesResponse }) {
  const { t } = useTranslation('organization')
  const { pick, lang } = useLang()
  const [search, setSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const catalogIds = useMemo(() => new Set(catalog.map((c) => c.id)), [catalog])
  const currentIds = useMemo(() => current.capabilities.map((c) => c.id), [current])
  // Capabilities the organization still has but the catalog no longer offers (deactivated):
  // the server refuses them (`CapabilityNotFound`), so a save drops them.
  const unavailable = useMemo(() => current.capabilities.filter((c) => !catalogIds.has(c.id)), [current, catalogIds])

  const [selected, setSelected] = useState<Set<string>>(() => new Set(currentIds.filter((id) => catalogIds.has(id))))
  const { added, removed } = capabilityChanges(currentIds, [...selected])
  const dirty = added.length > 0 || removed.length > 0

  const nameOf = useMemo(() => {
    const names = new Map<string, string>()
    for (const c of current.capabilities) names.set(c.id, pick(c.nameAr, c.nameEn))
    for (const c of catalog) names.set(c.id, pick(c.nameAr, c.nameEn))
    return (id: string) => names.get(id) ?? id
  }, [catalog, current, pick])

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? catalog.filter((c) => [c.nameAr, c.nameEn, c.code].some((s) => s?.toLowerCase().includes(term)))
      : catalog
    const grouped = groupCapabilities(filtered)
    const collator = new Intl.Collator(lang)
    for (const g of CAPABILITY_GROUPS) grouped[g].sort((a, b) => collator.compare(pick(a.nameAr, a.nameEn), pick(b.nameAr, b.nameEn)))
    return grouped
  }, [catalog, search, lang, pick])
  const totals = useMemo(() => groupCapabilities(catalog), [catalog])

  const save = useAction<string[], ProviderCapabilitiesResponse>({
    mutationFn: organizationApi.updateCapabilities,
    // Removing a capability also strips it from technicians' skills.
    invalidate: [qk.organization, qk.team],
    success: t('capabilities.saved'),
    onSuccess: () => setConfirmOpen(false),
  })

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const requestSave = () => {
    if (removed.length > 0) setConfirmOpen(true)
    else save.mutate([...selected])
  }

  const noMatch = CAPABILITY_GROUPS.every((g) => groups[g].length === 0)

  return (
    <>
      <CardBody className="space-y-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('capabilities.search')}
            aria-label={t('capabilities.search')}
            className="ps-9"
          />
        </div>

        {unavailable.length > 0 && (
          <p className="rounded-md border border-tone-waiting/30 bg-tone-waiting-soft px-3 py-2 text-sm text-tone-waiting">
            {t('capabilities.unavailable')} {unavailable.map((c) => pick(c.nameAr, c.nameEn)).join('، ')}
          </p>
        )}

        {noMatch ? (
          <EmptyState title={t('capabilities.noMatch')} className="py-8" />
        ) : (
          CAPABILITY_GROUPS.map((g) =>
            groups[g].length === 0 ? null : (
              <section key={g} aria-labelledby={`cap-group-${g}`} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 id={`cap-group-${g}`} className="text-sm font-semibold">
                    {t(`capabilities.groups.${g}`)}
                  </h3>
                  <span className="tabular text-xs text-muted-foreground">
                    {t('capabilities.groupCount', { selected: totals[g].filter((c) => selected.has(c.id)).length, total: totals[g].length })}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groups[g].map((c) => {
                    const on = selected.has(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(c.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors',
                          on ? 'border-primary bg-primary-soft/60 ring-1 ring-primary' : 'bg-surface hover:border-primary/40 hover:bg-muted/50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded border',
                            on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-surface',
                          )}
                          aria-hidden
                        >
                          {on && <Check className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{pick(c.nameAr, c.nameEn)}</span>
                          <span className="block text-xs text-muted-foreground">{t('capabilities.services', { count: c.servicesCount })}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ),
          )
        )}
      </CardBody>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-lg border-t bg-surface/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">{t('capabilities.selected', { count: selected.size })}</span>
            {dirty && (
              <span className="tabular ms-2 text-xs text-muted-foreground" dir="ltr">
                {t('capabilities.changes', { added: added.length, removed: removed.length })}
              </span>
            )}
          </p>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className={cn('mt-0.5 size-3.5 shrink-0', removed.length > 0 && 'text-tone-waiting')} aria-hidden />
            {t('capabilities.warning')}
          </p>
          {!confirmOpen && save.error ? <InlineError error={save.error} /> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {dirty && (
            <Button variant="ghost" onClick={() => setSelected(new Set(currentIds.filter((id) => catalogIds.has(id))))} disabled={save.isPending}>
              {t('capabilities.discard')}
            </Button>
          )}
          <Button onClick={requestSave} loading={save.isPending && !confirmOpen} disabled={!dirty}>
            {t('capabilities.save')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('capabilities.removeTitle')}
        description={t('capabilities.removeText')}
        target={
          <ul className="list-disc space-y-0.5 ps-5">
            {removed.map((id) => (
              <li key={id}>{nameOf(id)}</li>
            ))}
          </ul>
        }
        confirmLabel={t('capabilities.removeConfirm')}
        destructive
        submitting={save.isPending}
        error={save.error}
        onSubmit={() => save.mutate([...selected])}
      />
    </>
  )
}
