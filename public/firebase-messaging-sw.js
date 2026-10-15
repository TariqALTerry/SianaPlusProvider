/*
 * Web push for staff (PUSH-NOTIFICATIONS-DASHBOARD-PROMPT §3.2). Registered by src/features/push/webPush.ts
 * with the public Firebase config in the query string (a worker can't read import.meta.env).
 * The SDK version here must match the `firebase` package in package.json.
 *
 * Messages carry `notification`, so the browser shows them itself while the dashboard is in the
 * background; no onBackgroundMessage handler is needed.
 */

// Registered BEFORE the Firebase scripts: their own click handler stops later listeners.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()

  const data = (event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data) || {}
  // The /n/... route owns the reference → page mapping; it isn't repeated here.
  const params = new URLSearchParams()
  if (data.referenceType) params.set('referenceType', data.referenceType)
  if (data.referenceId) params.set('referenceId', data.referenceId)
  const path = data.notificationId ? `/n/${encodeURIComponent(data.notificationId)}${params.size ? `?${params}` : ''}` : '/'
  const url = new URL(path, self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const tab = windows.find((c) => new URL(c.url).origin === self.location.origin)
      if (!tab) return self.clients.openWindow(url)
      await tab.focus()
      // This worker's scope doesn't control the dashboard's pages, so client.navigate() would
      // reject: the open tab navigates itself (WebPushBridge listens for this message).
      tab.postMessage({ type: 'siana-push-open', path })
    })(),
  )
})

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams))
firebase.messaging()
