/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: { title?: string; body?: string; url?: string } = {}
  try {
    payload = event.data.json() as typeof payload
  } catch {
    payload = { body: event.data.text() }
  }

  const title = payload.title ?? 'Dayact follow-up'
  const body = payload.body ?? 'Something needs your attention.'
  const url = payload.url ?? '/followups'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) ?? '/followups'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          void client.focus()
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(url)
          }
          return
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
