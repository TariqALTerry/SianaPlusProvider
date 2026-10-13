import { Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InlineError } from '@/components/States'
import type { PaginatedResponse } from '@/api/types'
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv'
import { dayjs } from '@/lib/format'

const EXPORT_PAGE_SIZE = 100
const EXPORT_MAX_ROWS = 5000

interface ExportCsvButtonProps<T> {
  /** Fetches one page of the *current filtered* list. Called sequentially, never in parallel. */
  fetchPage: (page: number, pageSize: number, signal: AbortSignal) => Promise<PaginatedResponse<T>>
  columns: CsvColumn<T>[]
  filename: string
  disabled?: boolean
}

/**
 * Client-side CSV export (§4.3): pages through the endpoint at PageSize=100 up to 5,000 rows,
 * sequentially to respect the 120 req/min budget, with progress and cancel.
 */
export function ExportCsvButton<T>({ fetchPage, columns, filename, disabled }: ExportCsvButtonProps<T>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<unknown>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setError(null)
    setProgress({ done: 0, total: 0 })
    setOpen(true)
    const rows: T[] = []
    try {
      let page = 1
      for (;;) {
        const res = await fetchPage(page, EXPORT_PAGE_SIZE, controller.signal)
        rows.push(...res.items)
        const total = Math.min(res.totalCount, EXPORT_MAX_ROWS)
        setProgress({ done: Math.min(rows.length, total), total })
        if (!res.hasNextPage || rows.length >= EXPORT_MAX_ROWS || controller.signal.aborted) break
        page += 1
      }
      if (controller.signal.aborted) return
      const capped = rows.slice(0, EXPORT_MAX_ROWS)
      downloadCsv(`${filename}-${dayjs().format('YYYYMMDD-HHmm')}`, toCsv(capped, columns))
      toast.success(t('table.exportDone', { count: capped.length }))
      setOpen(false)
    } catch (e) {
      if (!controller.signal.aborted) setError(e)
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    setOpen(false)
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <Button variant="outline" size="sm" onClick={run} disabled={disabled}>
        <Download /> {t('actions.export')}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && cancel()}>
        <DialogContent size="sm" hideClose>
          <DialogHeader>
            <DialogTitle>{t('actions.export')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="tabular text-sm">{t('table.exporting', { done: progress.done, total: progress.total || '…' })}</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{t('table.exportLimit', { max: EXPORT_MAX_ROWS })}</p>
            <InlineError error={error} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={cancel}>
              {error ? t('actions.close') : t('actions.stop')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
