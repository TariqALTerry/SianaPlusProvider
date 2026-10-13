import { ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { fileUrl } from '@/api/files'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProvider } from '@/app/provider'
import { useUrlState } from '@/hooks/useUrlState'
import { BusinessModelTab } from './components/BusinessModelTab'
import { CapabilitiesTab } from './components/CapabilitiesTab'
import { CoverageTab } from './components/CoverageTab'
import { DocumentsTab } from './components/DocumentsTab'
import { OperationsTab } from './components/OperationsTab'
import { ProfileTab } from './components/ProfileTab'
import { ORGANIZATION_TABS, parseTab, type OrganizationTab } from './logic'
import './i18n'

const urlSchema = { tab: 'profile' }

/** ملف المنشأة (§8.9): one page, six tabs, the open tab in the URL. */
export function OrganizationPage() {
  const { t } = useTranslation('organization')
  const { org, mode } = useProvider()
  const { state, set } = useUrlState(urlSchema)
  const tab = parseTab(state.tab)

  // Before approval each tab doubles as an onboarding step; mark the ones still open.
  const steps = org.steps
  const incomplete: Record<OrganizationTab, boolean> =
    mode === 'full'
      ? { profile: false, documents: false, capabilities: false, coverage: false, operations: false, model: false }
      : {
          profile: !steps.profileComplete,
          documents: !steps.documentsUploaded,
          capabilities: !steps.capabilitiesSet,
          coverage: !steps.coverageSet,
          operations: !steps.capacitySet,
          model: !steps.businessModelSet,
        }

  const logo = fileUrl(org.logoUrl)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="size-9 rounded-md border bg-surface object-cover" />}
            <span>{t('title')}</span>
          </span>
        }
        meta={<StatusBadge enum="ProviderVerificationStatus" value={org.verificationStatus} />}
        description={org.displayName}
        actions={
          mode !== 'full' ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/onboarding">
                <ListChecks /> {t('openChecklist')}
              </Link>
            </Button>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v })}>
        <TabsList aria-label={t('title')}>
          {ORGANIZATION_TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
              {incomplete[key] && (
                <>
                  <span className="size-1.5 rounded-full bg-tone-waiting" aria-hidden />
                  <span className="sr-only">({t('tabIncomplete')})</span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="capabilities">
          <CapabilitiesTab />
        </TabsContent>
        <TabsContent value="coverage">
          <CoverageTab />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsTab />
        </TabsContent>
        <TabsContent value="model">
          <BusinessModelTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
