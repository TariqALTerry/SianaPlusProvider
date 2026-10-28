import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { useProvider } from '@/app/provider'
import './i18n'
import { ProductEditor } from './components/ProductEditor'
import { NotOperationalNote } from './components/StoreBits'
import { emptyDraft } from './productForm'

/** "منتج جديد يدويًا" (`/store/products/new`): the empty editor; the product belongs to this organization. */
export function ProductCreatePage() {
  const { t } = useTranslation('store')
  const [initial] = useState(emptyDraft)
  const { operational } = useProvider()

  return (
    <>
      <PageHeader
        back={{ to: '/store', label: t('products.title') }}
        title={t('editor.createTitle')}
        description={t('editor.ownerHint')}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/store/products/ai">
              <Sparkles /> {t('products.addAi')}
            </Link>
          </Button>
        }
      />
      {!operational && <NotOperationalNote />}
      <ProductEditor product={null} initialDraft={initial} initialGallery={[]} readOnly={!operational} />
    </>
  )
}
