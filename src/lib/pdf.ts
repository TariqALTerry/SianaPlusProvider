/**
 * PDFs behind the session (counter receipts, labels, invoices, warranties): fetched with the bearer token as a Blob,
 * then printed from a hidden iframe or shown in a new tab through a short-lived blob URL. Nothing is stored.
 */

const REVOKE_AFTER_MS = 60_000

function pdfUrl(blob: Blob): string {
  const typed = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
  const url = URL.createObjectURL(typed)
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
  return url
}

/**
 * Opens a tab now (inside the click, so pop-up blockers allow it) and points it at the PDF once it arrives. If the
 * fetch fails the tab is closed and the error goes back to the caller.
 */
export async function openPdf(load: () => Promise<Blob>): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const url = pdfUrl(await load())
    if (tab) tab.location.href = url
    else window.location.assign(url)
  } catch (error) {
    tab?.close()
    throw error
  }
}

/** Prints the PDF through a hidden iframe (the browser's print dialog, with the right paper size from the PDF). */
export async function printPdf(load: () => Promise<Blob>): Promise<void> {
  const url = pdfUrl(await load())
  await new Promise<void>((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    frame.onload = () => {
      // Give the PDF viewer a moment to render before asking it to print.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus()
          frame.contentWindow?.print()
        } catch {
          // A browser that refuses to print a PDF from a frame: open it instead.
          window.open(url, '_blank')
        }
        setTimeout(() => frame.remove(), REVOKE_AFTER_MS)
        resolve()
      }, 300)
    }
    frame.src = url
    document.body.appendChild(frame)
  })
}
