// CueX Admin Service Worker
// Version: cuex-pwa-v3
// Handles: Push Notifications, Offline Navigation Fallback, Background Sync

const CACHE_NAME = 'cuex-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/admin-app',
  '/admin',
  '/booking',
  '/availability',
  '/gallery',
  '/about',
  '/contact',
  '/auth',
  '/my-bookings',
  '/manifest.json',
  '/assets/cuex-logo.png',
  '/assets/notification.wav',
  '/favicon.svg',
];

// ─── Install: Pre-cache SPA routes & core assets ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual puts so a single route failure doesn't break cache installation
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activate: Purge old caches & take control ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: SPA Navigation Fallback + Asset Caching ──────────────────────────
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

  // 1. SPA Navigation Requests (e.g., opening app, typing URL, page refresh)
  // NEVER let a navigation request return 404!
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If server returned 404 or an error, serve cached index.html so React Router takes over!
          if (!response || response.status === 404 || !response.ok) {
            return caches.match('/index.html')
              .then((cached) => cached || caches.match('/') || response);
          }
          // Cache successful navigation response for offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          // Network failed or offline:
          // Try matching this specific route first, then fall back to /index.html or /
          const routeMatch = await caches.match(event.request);
          if (routeMatch) return routeMatch;
          const indexMatch = await caches.match('/index.html');
          if (indexMatch) return indexMatch;
          const rootMatch = await caches.match('/');
          if (rootMatch) return rootMatch;
          return new Response('<!DOCTYPE html><html><body><h1>CueX Offline</h1><p>Please reconnect to the internet.</p></body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS chunks, CSS, images, fonts)
  // Stale-While-Revalidate: serve cached version immediately, update cache in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
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
