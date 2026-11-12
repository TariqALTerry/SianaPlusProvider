import { ExternalLink, Info, MapPin, Package, Pencil, Plus, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StoreWarehouseResponse } from '@/api/types'
import { Num } from '@/components/Format'
import { PageHeader } from '@/components/PageHeader'
import { PhoneText } from '@/components/PhoneText'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProvider } from '@/app/provider'
import { cn } from '@/lib/utils'
import './i18n'
import { isStoreGateError } from './api'
import { NotOperationalNote, StoreTabs, StoreUnavailable } from './components/StoreBits'
import { WarehouseDialog } from './components/WarehouseDialog'
import { useWarehouses } from './hooks'
import { googleMapsUrl, warehousePlace } from './warehouses'

/**
 * `/store/warehouses` (2026-11-12): where the organization's store products are kept; the courier picks them up there.
 * A short array (active first), so cards rather than a paged table. No delete: a warehouse is stopped instead.
 */
export function WarehousesPage() {
  const { t } = useTranslation('store')
  const { operational } = useProvider()
  const query = useWarehouses()
  const [editing, setEditing] = useState<StoreWarehouseResponse | null | undefined>(undefined)

  if (isStoreGateError(query.error)) return <StoreUnavailable error={query.error} />

  const disabledTitle = operational ? undefined : t('notOperational')
  const addButton = (
    <Button size="sm" onClick={() => setEditing(null)} disabled={!operational} title={disabledTitle}>
      <Plus /> {t('warehouses.add')}
    </Button>
  )

  return (
    <>
      <PageHeader title={t('warehouses.title')} description={t('warehouses.description')} actions={addButton} />
      <StoreTabs />
      {!operational && <NotOperationalNote />}

      <p className="mb-4 flex items-start gap-2 rounded-md bg-tone-info-soft px-3 py-2 text-sm text-tone-info" role="note">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t('warehouses.hint')}
      </p>

      {query.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <Card>
          <EmptyState icon={<Warehouse className="size-5" />} title={t('warehouses.empty')} action={operational ? addButton : undefined} />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {query.data.map((w) => (
            <WarehouseCard key={w.id} w={w} onEdit={operational ? () => setEditing(w) : undefined} />
          ))}
        </ul>
      )}

      {operational && <WarehouseDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} warehouse={editing} />}
    </>
  )
}

function WarehouseCard({ w, onEdit }: { w: StoreWarehouseResponse; onEdit?: () => void }) {
  const { t } = useTranslation('store')
  return (
    <li>
      <Card className={cn('flex h-full flex-col gap-3 p-4', !w.isActive && 'bg-muted/40')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-semibold">{w.name}</span>
              {w.isActive ? <Badge tone="success">{t('warehouses.active')}</Badge> : <Badge tone="muted">{t('warehouses.inactive')}</Badge>}
            </p>
            <p className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">
                {warehousePlace(w)}
                {w.addressLine && <span className="block truncate text-xs">{w.addressLine}</span>}
              </span>
            </p>
          </div>
          {onEdit && (
            <Button size="xs" variant="outline" onClick={onEdit}>
              <Pencil /> {t('warehouses.edit')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Package className="size-3.5 text-muted-foreground" aria-hidden />
            <span>
              <Num value={w.productCount} className="font-medium" /> <span className="text-muted-foreground">{t('warehouses.productsLabel')}</span>
            </span>
          </span>
          <a
            href={googleMapsUrl(w.latitude, w.longitude)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden /> {t('warehouses.openMap')}
          </a>
        </div>

        <div className="mt-auto border-t pt-2 text-sm">
          {w.contactName || w.contactPhone ? (
            <p className="flex flex-wrap items-center gap-x-2">
              {w.contactName && <span>{w.contactName}</span>}
              {w.contactPhone && <PhoneText phone={w.contactPhone} className="text-xs" />}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('warehouses.noContact')}</p>
          )}
          {w.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.notes}</p>}
        </div>
      </Card>
    </li>
  )
}
