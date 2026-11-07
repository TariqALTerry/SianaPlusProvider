import { Eraser } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SignaturePadHandle {
  /** A PNG of the drawing, or null when nothing was drawn. */
  toFile: () => Promise<File | null>
  clear: () => void
  isEmpty: () => boolean
}

/**
 * A finger / pen / mouse signature box (Pointer Events on a canvas, no library). The ink is always dark on a white
 * background so the PNG prints well whatever the theme.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string; onChange?: (empty: boolean) => void; label: string }>(function SignaturePad(
  { className, onChange, label },
  ref,
) {
  const { t } = useTranslation('counter')
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)
  // Kept in a ref so a new callback each render never re-runs the sizing effect (which clears the drawing).
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const setEmptyState = useCallback((v: boolean) => {
    setEmpty(v)
    onChangeRef.current?.(v)
  }, [])

  // Size the backing store to the element (and the screen density) so strokes stay sharp.
  const fit = useCallback(() => {
    const c = canvas.current
    if (!c) return
    const ratio = Math.max(1, window.devicePixelRatio || 1)
    const { width, height } = c.getBoundingClientRect()
    c.width = Math.round(width * ratio)
    c.height = Math.round(height * ratio)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1f1a'
  }, [])

  useEffect(() => {
    fit()
    // A resize clears the drawing; keep it simple and say so through the empty state.
    const onResize = () => {
      fit()
      setEmptyState(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fit, setEmptyState])

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const clear = useCallback(() => {
    fit()
    setEmptyState(true)
  }, [fit, setEmptyState])

  useImperativeHandle(
    ref,
    () => ({
      clear,
      isEmpty: () => empty,
      toFile: () =>
        new Promise<File | null>((resolve) => {
          if (empty || !canvas.current) return resolve(null)
          canvas.current.toBlob((blob) => resolve(blob ? new File([blob], 'signature.png', { type: 'image/png' }) : null), 'image/png')
        }),
    }),
    [clear, empty],
  )

  return (
    <div className={cn('space-y-2', className)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-input bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drawing.current = true
          last.current = point(e)
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return
          const ctx = e.currentTarget.getContext('2d')
          if (!ctx) return
          const p = point(e)
          ctx.beginPath()
          ctx.moveTo(last.current.x, last.current.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          last.current = p
          if (empty) setEmptyState(false)
        }}
        onPointerUp={() => {
          drawing.current = false
          last.current = null
        }}
        onPointerCancel={() => {
          drawing.current = false
          last.current = null
        }}
      />
      <Button size="sm" variant="ghost" onClick={clear} disabled={empty}>
        <Eraser /> {t('wizard.clear')}
      </Button>
    </div>
  )
})
