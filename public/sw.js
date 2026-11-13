// CueX Admin Service Worker
// Handles: Push Notifications, Background Sync, Offline Cache

const CACHE_NAME = 'cuex-admin-v1';
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/assets/cuex-logo.png',
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch (Network-first for API, Cache-first for static) ─────────────────
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

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/JS/CSS responses
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
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
    url: '/admin',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {}
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 300, 100, 200],
    actions: [
      { action: 'view', title: '✅ View & Confirm' },
      { action: 'dismiss', title: '✕ Dismiss' },
    ],
    data: { url: data.url },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click Handler ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
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

// ─── Background Sync (optional, for offline action queuing) ────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'cuex-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
      })
    );
  }
});
