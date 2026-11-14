/**
 * CueX PWA Manager
 * - Registers the service worker
 * - Handles Web Push subscription (VAPID)
 * - Persists admin subscriptions in Supabase
 * - Triggers background notifications even when app/browser is completely closed
 */
import { supabase } from './supabase';

// VAPID public key with fallback to CueX production key
export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BETjBu9ielhfbIVwiiX-4KrxcxkfqhNPMDSeBEGUsytXrurVANe91AApv4eNLMFKYEb1hnnEhoz9oBfU5ZfTF5k';

const PUSH_FUNCTION_URL =
  'https://vetyyyemzhqinqoeqakz.supabase.co/functions/v1/notify-admin-booking';

let swRegistration: ServiceWorkerRegistration | null = null;

// ─── Register Service Worker ───────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  swRegistration = (await navigator.serviceWorker.getRegistration('/')) || null;
  return swRegistration;
}

// ─── Persist Push Subscription to Supabase ─────────────────────────────────
async function saveSubscriptionToBackend(sub: PushSubscription): Promise<boolean> {
  try {
    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys) return false;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    // 1. Direct DB upsert
    await supabase.from('cuex_push_subscriptions').upsert(
      {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_id: userId,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    // 2. Also notify Edge Function
    await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subJson,
        user_id: userId,
        user_agent: navigator.userAgent,
      }),
    }).catch(() => {});

    console.info('[CueX PWA] Push subscription saved to Supabase');
    return true;
  } catch (err) {
    console.warn('[CueX PWA] Failed to save subscription to Supabase:', err);
    return false;
  }
}

// ─── Request Notification Permission + Subscribe to Push ──────────────────
export async function setupPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  try {
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
      console.info('[CueX PWA] New push subscription created:', sub.endpoint);
    }

    await saveSubscriptionToBackend(sub);
    return sub;
  } catch (err) {
    console.error('[CueX PWA] Push subscription failed:', err);
    return null;
  }
}

// ─── Check Current Push Status ─────────────────────────────────────────────
export async function getPushSubscriptionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  endpoint: string | null;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { supported: false, permission: 'denied', subscribed: false, endpoint: null };
  }

  const permission = Notification.permission;
  const reg = await getSwRegistration();
  if (!reg) {
    return { supported: true, permission, subscribed: false, endpoint: null };
  }

  try {
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      subscribed: !!sub,
      endpoint: sub ? sub.endpoint : null,
    };
  } catch {
    return { supported: true, permission, subscribed: false, endpoint: null };
  }
}

// ─── Send Push Notification to All Admin Devices ───────────────────────────
export async function sendAdminPush(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('[CueX PWA] Failed to dispatch admin push:', err);
    return false;
  }
}

// ─── Customer Push Subscription (with Phone) ─────────────────────────────
export async function setupCustomerPushSubscription(phone?: string): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  try {
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    const subJson = sub.toJSON();
    if (subJson.endpoint && subJson.keys) {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || null;
      const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

      await supabase.from('cuex_push_subscriptions').upsert(
        {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          user_id: userId,
          phone: cleanPhone,
          role: 'customer',
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      await fetch(PUSH_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription: subJson,
          user_id: userId,
          phone: cleanPhone,
          role: 'customer',
          user_agent: navigator.userAgent,
        }),
      }).catch(() => {});
    }

    return sub;
  } catch (err) {
    console.error('[CueX PWA] Customer push subscription failed:', err);
    return null;
  }
}

// ─── Send Push to a Specific Customer ──────────────────────────────────────
export async function sendCustomerPush(payload: {
  phone?: string;
  user_id?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        target: 'customer',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[CueX PWA] Failed to dispatch customer push:', err);
    return false;
  }
}

// ─── Test Background Push (Delayed so user can lock screen/close app) ──────
export async function testBackgroundPush(delaySeconds: number = 4): Promise<void> {
  // Ensure subscribed first
  await setupPushSubscription();

  // Schedule push after delay
  setTimeout(async () => {
    await sendAdminPush({
      title: '🎱 CueX Booking Alert (Test)',
      body: 'Background notifications are working! You will receive alerts even when CueX is closed.',
      url: '/admin-app?tab=pending',
      tag: 'cuex-test-' + Date.now(),
    });
  }, delaySeconds * 1000);
}

// ─── Show Notification via Service Worker (Foreground/Background tab) ─────
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
      silent: false,
      vibrate: [300, 150, 300, 150, 500],
      data: { url },
    } as NotificationOptions);
  } else {
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
  if (typeof window === 'undefined') return false;
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
  return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
}

export function canInstallPwa(): boolean {
  return !!deferredInstallPrompt;
}
