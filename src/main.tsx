import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/menu'
import { queryClient } from '@/api/queryClient'
import { router } from '@/app/router'
import { useTheme } from '@/app/theme'
import { useLang } from '@/hooks/useLang'
import '@/i18n'
import '@/styles/globals.css'

/**
 * After a deploy, the old index.html references chunks that no longer exist; the next lazy
 * navigation fails. One reload (guarded by a cooldown) recovers.
 */
const RELOAD_GUARD = 'siana.provider.preloadReload'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const last = Number(sessionStorage.getItem(RELOAD_GUARD) ?? '0')
  if (Date.now() - last < 10_000) return
  sessionStorage.setItem(RELOAD_GUARD, String(Date.now()))
  window.location.reload()
})

function ThemedToaster() {
  const theme = useTheme((s) => s.theme)
  const { isRtl } = useLang()
  return <Toaster theme={theme} dir={isRtl ? 'rtl' : 'ltr'} position={isRtl ? 'bottom-left' : 'bottom-right'} richColors closeButton />
}

const container = document.getElementById('root')
if (!container) throw new Error('#root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
