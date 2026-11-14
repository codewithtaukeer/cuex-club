// CueX Service Worker
// Version: cuex-pwa-v4
// Handles: Push Notifications, Rock-Solid SPA Navigation Fallback, Background Sync

const CACHE_NAME = 'cuex-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/cuex-logo.png',
  '/assets/notification.wav',
  '/favicon.svg',
];

// ─── Install: Pre-cache SPA core shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok && !res.redirected) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activate: Purge old caches & claim immediately ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: Bulletproof SPA Navigation & Static Assets ─────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, Supabase API, and browser extension requests
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // 1. SPA Navigation Requests (e.g., address bar, link navigation, page refresh)
  // MUST NEVER fail with ERR_FAILED or show a broken page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch
          const networkResponse = await fetch(event.request);

          // If clean 200 OK non-redirected response, cache /index.html and return
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            try {
              const cache = await caches.open(CACHE_NAME);
              cache.put('/index.html', networkResponse.clone()).catch(() => {});
            } catch {}
            return networkResponse;
          }

          // If server returned a redirect (e.g. 307 trailing slash) or 404:
          // In W3C specification, returning a redirected response to top-level navigation can trigger ERR_FAILED in Chrome.
          // In an SPA, all routes (/my-bookings, /admin, etc.) are rendered by /index.html!
          const cachedIndex =
            (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedIndex) {
            return cachedIndex;
          }

          // If not cached, fetch clean /index.html directly without route parameters
          const cleanIndex = await fetch('/index.html', { cache: 'no-cache' });
          if (cleanIndex.ok) {
            return cleanIndex;
          }

          return networkResponse;
        } catch {
          // Offline or network error: return cached SPA shell
          const cachedIndex =
            (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedIndex) {
            return cachedIndex;
          }

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CueX</title></head><body style="background:#0e100f;color:#e8e4dc;font-family:sans-serif;text-align:center;padding:50px;"><h2>CueX Offline</h2><p>Please check your connection and refresh.</p><button onclick="location.reload()" style="padding:10px 20px;background:#c8a45d;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Retry</button></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }
          );
        }
      })()
    );
    return;
  }

  // 2. Static Assets (JS chunks, CSS, images, fonts)
  // Stale-While-Revalidate with error suppression
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.ok &&
            !networkResponse.redirected &&
            (networkResponse.type === 'basic' || networkResponse.type === 'cors')
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ─── Push Notification Handler ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: '🎱 New CueX Booking Request!',
    body: 'A customer has requested a slot. Tap to review.',
    icon: '/assets/cuex-logo.png',
    badge: '/assets/cuex-logo.png',
    tag: 'cuex-booking',
    url: '/admin-app?tab=pending',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {}
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/cuex-logo.png',
    badge: data.badge || '/assets/cuex-logo.png',
    tag: data.tag || 'cuex-booking',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [300, 150, 300, 150, 500],
    sound: '/assets/notification.wav',
    actions: [
      { action: 'view', title: '🎱 View & Confirm' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
    data: { url: data.url || '/admin-app?tab=pending' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click Handler ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin-app?tab=pending';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if ((client.url.includes('/admin-app') || client.url.includes('/admin')) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Background Sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'cuex-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
      })
    );
  }
});
