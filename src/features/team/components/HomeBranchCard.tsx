import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { qk } from '@/api/keys'
import type { ExecutorResponse } from '@/api/types'
import { InlineError } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/label'
import { branchesApi } from '@/features/branches/api'
import { BranchSelect } from '@/features/branches/BranchSelect'
import '@/features/branches/i18n'
import { useAction } from '@/hooks/useAction'

/**
 * فرع العمل (PROVIDER-BRANCHES phase 1 §7): the branch a technician works from — they show on its board and are offered
 * for its services. Owner and supervisors; `null` clears it. Stopped branches are not offered (`BranchInactive`).
 */
export function HomeBranchCard({ executor }: { executor: ExecutorResponse }) {
  const { t } = useTranslation('branches')
  const uid = useId()
  const [value, setValue] = useState<string | null>(executor.homeBranchId)
  useEffect(() => setValue(executor.homeBranchId), [executor.homeBranchId])

  const save = useAction({
    mutationFn: (branchId: string | null) => branchesApi.setExecutorHomeBranch(executor.id, branchId),
    invalidate: [qk.team, qk.board, qk.branches],
    success: t('homeBranch.saved'),
  })

  return (
    <Card>
      <CardHeader title={t('homeBranch.label')} description={t('homeBranch.hint')} />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('homeBranch.label')} htmlFor={`${uid}-branch`} className="min-w-[16rem] flex-1 sm:flex-none">
            <BranchSelect id={`${uid}-branch`} value={value} onChange={setValue} emptyLabel={t('homeBranch.none')} />
          </Field>
          <Button onClick={() => save.mutate(value)} loading={save.isPending} disabled={value === executor.homeBranchId}>
            {t('common:actions.save')}
          </Button>
        </div>
        <InlineError error={save.error} />
      </CardBody>
    </Card>
  )
}
