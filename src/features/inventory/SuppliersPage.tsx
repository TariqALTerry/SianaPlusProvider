import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listQueryOptions } from '@/api/queryClient'
import type { SupplierResponse } from '@/api/types'
import { ActionDialog } from '@/components/ActionDialog'
import { DataTable } from '@/components/DataTable'
import { QuickTabs, SearchInput } from '@/components/Filters'
import { DateTime } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckboxField } from '@/components/ui/checkbox'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { useRoleKind } from '@/features/auth/authStore'
import { useAction } from '@/hooks/useAction'
import { useUrlState } from '@/hooks/useUrlState'
import { INVENTORY_INVALIDATION, inventoryApi, inventoryKeys, type SupplierListParams } from './api'
import { InventoryTabs } from './components/Shared'
import { canWriteInventory, EMPTY_SUPPLIER, INVENTORY_LIMITS, supplierDraft, supplierRequest, validateSupplier, type SupplierDraft } from './logic'
import './i18n'

const schema = { state: 'active', search: '', page: 1, pageSize: 25 }

function SupplierDialog({ open, onOpenChange, supplier }: { open: boolean; onOpenChange: (open: boolean) => void; supplier?: SupplierResponse | null }) {
  const { t } = useTranslation('inventory')
  const uid = useId()
  const [draft, setDraft] = useState<SupplierDraft>(EMPTY_SUPPLIER)
  const [tried, setTried] = useState(false)
  const action = useAction({
    mutationFn: (d: SupplierDraft) => (supplier ? inventoryApi.updateSupplier(supplier.id, supplierRequest(d)) : inventoryApi.createSupplier(supplierRequest(d))),
    invalidate: INVENTORY_INVALIDATION,
    success: supplier ? t('supplier.saved') : t('supplier.created'),
    onSuccess: () => onOpenChange(false),
  })
  const { reset } = action
  useEffect(() => {
    if (open) {
      setDraft(supplier ? supplierDraft(supplier) : EMPTY_SUPPLIER)
      setTried(false)
      reset()
    }
  }, [open, supplier, reset])

  const errors = validateSupplier(draft)
  const show = (k: keyof SupplierDraft) => (tried && errors[k] ? t(`errors.${errors[k]}`) : undefined)
  const patch = (p: Partial<SupplierDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={supplier ? t('actions.editSupplier') : t('actions.addSupplier')}
      target={supplier?.name}
      confirmLabel={t('common:actions.save')}
      submitting={action.isPending}
      error={action.error}
      onSubmit={() => {
        setTried(true)
        if (Object.keys(errors).length === 0) action.mutate(draft)
      }}
    >
      <Field label={t('form.supplierName')} htmlFor={`${uid}-name`} required error={show('name')}>
        <Input id={`${uid}-name`} dir="auto" className="h-11" value={draft.name} maxLength={INVENTORY_LIMITS.supplierName} onChange={(e) => patch({ name: e.target.value })} autoFocus />
      </Field>
      <Field label={t('form.supplierPhone')} htmlFor={`${uid}-phone`} optional error={show('phone')}>
        <Input id={`${uid}-phone`} type="tel" dir="ltr" className="h-11 font-latin" value={draft.phone} maxLength={INVENTORY_LIMITS.supplierPhone} onChange={(e) => patch({ phone: e.target.value })} />
      </Field>
      <Field label={t('form.supplierNotes')} htmlFor={`${uid}-notes`} optional error={show('notes')}>
        <Textarea id={`${uid}-notes`} dir="auto" rows={3} value={draft.notes} maxLength={INVENTORY_LIMITS.supplierNotes} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>
      <CheckboxField id={`${uid}-active`} checked={draft.isActive} onCheckedChange={(isActive) => patch({ isActive })} label={t('form.supplierActive')} />
    </ActionDialog>
  )
}

/** `/inventory/suppliers` (phase 6 §4): where parts come from and where defective ones go back. No delete. */
export function SuppliersPage() {
  const { t } = useTranslation('inventory')
  const write = canWriteInventory(useRoleKind())
  const { state, set } = useUrlState(schema)
  const [editing, setEditing] = useState<SupplierResponse | null | undefined>(undefined)

  const params: SupplierListParams = {
    search: state.search || undefined,
    isActive: state.state === 'active' ? true : state.state === 'inactive' ? false : undefined,
    page: state.page,
    pageSize: state.pageSize,
  }
  const list = useQuery({ queryKey: inventoryKeys.suppliers(params), queryFn: ({ signal }) => inventoryApi.suppliers(params, signal), ...listQueryOptions })

  const columns = useMemo<ColumnDef<SupplierResponse, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('col.name'),
        meta: { alwaysVisible: true, cardTitle: true },
        cell: ({ row: { original: s } }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{s.name}</span>
            {!s.isActive && <Badge tone="muted">{t('inactive')}</Badge>}
          </span>
        ),
      },
      {
        id: 'phone',
        header: t('col.phone'),
        cell: ({ row: { original: s } }) =>
          s.phone ? (
            <a href={`tel:${s.phone}`} className="font-latin text-sm text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              <bdi className="ltr-nums">{s.phone}</bdi>
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'notes', header: t('col.notes'), cell: ({ row: { original: s } }) => <span className="line-clamp-2 text-sm text-muted-foreground">{s.notes ?? '—'}</span> },
      { id: 'created', header: t('col.createdAt'), meta: { cardHidden: true }, cell: ({ row: { original: s } }) => <DateTime value={s.createdAt} mode="date" className="text-xs text-muted-foreground" /> },
    ],
    [t],
  )

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('tabs.suppliers')}
        actions={
          write ? (
            <Button size="lg" onClick={() => setEditing(null)}>
              <Plus /> {t('actions.addSupplier')}
            </Button>
          ) : undefined
        }
      />
      <InventoryTabs />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <QuickTabs
          value={state.state}
          onChange={(v) => set({ state: v })}
          tabs={[
            { key: 'active', label: t('filter.active') },
            { key: 'inactive', label: t('filter.inactive') },
            { key: 'all', label: t('filter.allStates') },
          ]}
        />
        <SearchInput value={state.search} onChange={(search) => set({ search })} placeholder={t('search.suppliers')} />
      </div>
      <DataTable
        id="inventory-suppliers"
        columns={columns}
        query={list}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={(page) => set({ page })}
        onPageSizeChange={(pageSize) => set({ pageSize })}
        getRowId={(s) => s.id}
        onRowClick={write ? (s) => setEditing(s) : undefined}
        filtered={!!state.search}
        onClearFilters={() => set({ search: '' })}
        emptyTitle={state.search ? t('empty.stockSearch') : t('empty.suppliers')}
      />
      {write && <SupplierDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} supplier={editing} />}
    </>
  )
}
