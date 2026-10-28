import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, PageSkeleton } from '@/components/States'
import { StatusBadge } from '@/components/StatusBadge'
import { detailQueryOptions } from '@/api/queryClient'
import { useProvider } from '@/app/provider'
import { useLang } from '@/hooks/useLang'
import './i18n'
import { errorCodeOf, isStoreGateError, storeProductKeys, storeProductsApi } from './api'
import { ProductEditor } from './components/ProductEditor'
import { AiBadge, DraftBadge, NotOperationalNote, StoreUnavailable } from './components/StoreBits'
import { draftFromProduct, galleryFromImages } from './productForm'

/** One product (`/store/products/:id`). Another organization's product is `StoreProductNotFound`: back to the list. */
export function ProductEditPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('store')
  const { pick } = useLang()
  const navigate = useNavigate()
  const { operational } = useProvider()

  const query = useQuery({
    queryKey: storeProductKeys.detail(id),
    queryFn: ({ signal }) => storeProductsApi.detail(id, signal),
    retry: (count, error) => count < 2 && !errorCodeOf(error),
    ...detailQueryOptions,
  })

  const notFound = errorCodeOf(query.error) === 'StoreProductNotFound'
  useEffect(() => {
    if (!notFound) return
    toast.error(t('errors.StoreProductNotFound'), { id: 'store-product-not-found' })
    navigate('/store', { replace: true })
  }, [notFound, navigate, t])

  const back = { to: '/store', label: t('products.title') }
  if (isStoreGateError(query.error)) return <StoreUnavailable error={query.error} />
  if (query.isError && !notFound) {
    return (
      <>
        <PageHeader title={t('products.title')} back={back} />
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </>
    )
  }
  if (!query.data) return <PageSkeleton />
  const p = query.data

  return (
    <>
      <PageHeader
        back={back}
        title={pick(p.nameAr, p.nameEn)}
        meta={
          <>
            {p.isActive ? <StatusBadge enum="ActiveFilter" value="Active" /> : <DraftBadge />}
            {p.isAiGenerated && <AiBadge />}
          </>
        }
        description={<span className="ltr-nums font-latin">{p.sku}</span>}
      />
      {!operational && <NotOperationalNote />}
      <ProductEditor key={p.id} product={p} initialDraft={draftFromProduct(p)} initialGallery={galleryFromImages(p.images)} readOnly={!operational} />
    </>
  )
}
