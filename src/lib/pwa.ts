/**
 * CueX PWA Manager
 * - Registers the service worker
 * - Handles Web Push subscription (VAPID)
 * - Provides hooks for subscribing/unsubscribing
 * 
 * NOTE: For background push (app closed), you need a push server.
 * This file sets up the client side. The push will be triggered
 * via Supabase Edge Function or a simple Node server.
 * 
 * For immediate use WITHOUT a push server, the service worker still
 * handles: install-to-homescreen, offline caching, and foreground
 * notification display via Notification API (which works while the
 * app is open). True background push requires a server sending
 * PushEvent — see setupPushSubscription() below.
 */

// VAPID public key — generate at https://vapidkeys.com or use web-push CLI
// Replace this with your real key when you set up a push server
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

let swRegistration: ServiceWorkerRegistration | null = null;

// ─── Register Service Worker ───────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[CueX PWA] Service workers not supported.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    console.info('[CueX PWA] Service worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[CueX PWA] Service worker registration failed:', err);
    return null;
  }
}

// ─── Get Active Registration ───────────────────────────────────────────────
export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (!('serviceWorker' in navigator)) return null;
  swRegistration = (await navigator.serviceWorker.getRegistration('/')) || null;
  return swRegistration;
}

// ─── Request Notification Permission + Subscribe to Push ──────────────────
export async function setupPushSubscription(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    // No VAPID key set — foreground Notification API still works
    console.warn('[CueX PWA] No VAPID_PUBLIC_KEY set; background push unavailable.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const reg = await getSwRegistration();
  if (!reg) return null;

  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    console.info('[CueX PWA] Push subscription created:', sub.endpoint);
    return sub;
  } catch (err) {
    console.error('[CueX PWA] Push subscription failed:', err);
    return null;
  }
}

// ─── Show Notification via Service Worker (works when tab not focused) ─────
export async function showSwNotification(title: string, body: string, url = '/admin'): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const reg = await getSwRegistration();
  if (reg) {
    await reg.showNotification(title, {
      body,
      icon: '/assets/cuex-logo.png',
      badge: '/assets/cuex-logo.png',
      tag: 'cuex-booking',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 300],
      data: { url },
    } as NotificationOptions);
  } else {
    // Fallback: direct Notification API
    new Notification(title, { body, icon: '/assets/cuex-logo.png' });
  }
}

// ─── Helper: Convert VAPID key ─────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

// ─── Check if installed as PWA ─────────────────────────────────────────────
export function isPwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ─── Prompt Install (deferred prompt API) ──────────────────────────────────
let deferredInstallPrompt: Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as typeof deferredInstallPrompt;
  });
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt || !deferredInstallPrompt.prompt) return 'unavailable';
  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return (choice?.outcome === 'accepted') ? 'accepted' : 'dismissed';
}

export function canInstallPwa(): boolean {
  return !!deferredInstallPrompt;
}
