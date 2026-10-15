import { useQuery } from '@tanstack/react-query'
import { BellOff, BellRing } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { useAction } from '@/hooks/useAction'
import { disableWebPush, enableWebPush, myPushDevices, useWebPush } from './webPush'
import './i18n'

const devicesKey = [...qk.notifications, 'push-devices'] as const

/** "إشعارات هذا المتصفح" (PHASE2 §8): on/off for this browser; hidden without the VITE_FIREBASE_* values. */
export function BrowserAlertsCard() {
  const { t } = useTranslation('push')
  const state = useWebPush((s) => s.state)
  const [denied, setDenied] = useState(false)
  const mine = useQuery({ queryKey: devicesKey, queryFn: ({ signal }) => myPushDevices(signal), enabled: state !== 'hidden' })
  const browsers = (mine.data ?? []).filter((d) => d.platform === 'Web' && d.app === 'Provider').length
  const enable = useAction({ mutationFn: enableWebPush, invalidate: [devicesKey], onSuccess: (s) => setDenied(s !== 'on' && s !== 'blocked') })
  const disable = useAction({ mutationFn: () => disableWebPush(), invalidate: [devicesKey] })

  if (state === 'hidden') return null
  return (
    <Card>
      <CardHeader title={t('browser.title')} description={t('browser.description')} />
      <CardBody className="space-y-2">
        {state === 'unsupported' ? (
          <p className="text-sm text-muted-foreground">{t('browser.unsupported')}</p>
        ) : state === 'blocked' ? (
          <p role="status" className="rounded-md border border-tone-attention/40 bg-tone-attention-soft px-3 py-2 text-sm text-tone-attention">
            {t('browser.blocked')}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={state === 'on' ? 'success' : 'muted'} dot>
              {state === 'on' ? t('browser.enabled') : t('browser.disabled')}
            </Badge>
            {state === 'on' ? (
              <Button size="sm" variant="ghost" loading={disable.isPending} onClick={() => disable.mutate()}>
                <BellOff /> {t('browser.disable')}
              </Button>
            ) : (
              <Button size="sm" loading={enable.isPending} onClick={() => enable.mutate()}>
                <BellRing /> {t('browser.enable')}
              </Button>
            )}
          </div>
        )}
        {denied && state === 'off' && <p className="text-xs text-muted-foreground">{t('browser.denied')}</p>}
        {enable.error ? <p className="text-xs text-tone-danger">{t('browser.enableFailed')}</p> : null}
        {mine.data && <p className="text-xs text-muted-foreground">{t('browser.registeredOn', { count: browsers })}</p>}
      </CardBody>
    </Card>
  )
}
