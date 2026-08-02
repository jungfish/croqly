/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

// Injected at build time by vite-plugin-pwa's injectManifest strategy — the
// static asset list generateSW would otherwise have produced automatically.
precacheAndRoute(self.__WB_MANIFEST);

// SPA offline fallback — serves the cached index.html shell for any
// navigation that isn't a cache hit, same as generateSW's default
// navigateFallback, but excluding /api/ so a failed API call never gets
// silently swapped for an HTML page.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }));

type PushPayload = { title: string; body: string; url?: string };

// Push payloads always come from server/lib/webPush.ts as JSON — see the
// PushPayload shape there.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json() as PushPayload;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url: payload.url ?? '/' },
    })
  );
});

// Focuses an already-open Croqly tab instead of always spawning a new one —
// most users tap a notification while the app is still open in the background.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsList.find((client) => 'focus' in client) as WindowClient | undefined;
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
