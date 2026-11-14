/**
 * CueX PWA Manager
 * - Registers the service worker
 * - Handles Web Push subscription (VAPID)
 * - Persists subscriptions exclusively via secured Edge Function
 * - Triggers background notifications even when app/browser is completely closed
 */
import { supabase } from './supabase';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vetyyyemzhqinqoeqakz.supabase.co';

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BETjBu9ielhfbIVwiiX-4KrxcxkfqhNPMDSeBEGUsytXrurVANe91AApv4eNLMFKYEb1hnnEhoz9oBfU5ZfTF5k';

const PUSH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/notify-admin-booking`;

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

// ─── Get or Renew Subscription (handles key rotation) ─────────────────────
async function getOrRenewSubscription(reg: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      const currentKeyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subKey = sub.options.applicationServerKey;
      let keyMatches = false;
      if (subKey) {
        const subKeyBytes = new Uint8Array(subKey);
        if (subKeyBytes.length === currentKeyArray.length) {
          keyMatches = subKeyBytes.every((b, i) => b === currentKeyArray[i]);
        }
      }
      if (!keyMatches) {
        console.info('[CueX PWA] VAPID key mismatch; renewing push subscription...');
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    } catch {
      sub = null;
    }
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
    console.info('[CueX PWA] Push subscription established:', sub.endpoint);
  }

  return sub;
}

// ─── Persist Push Subscription via Secured Edge Function ──────────────────
async function saveSubscriptionToBackend(
  sub: PushSubscription,
  role: 'admin' | 'customer' = 'admin',
  phone?: string | null
): Promise<boolean> {
  try {
    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys) return false;

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

    const res = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subJson,
        phone: cleanPhone,
        role,
        user_agent: navigator.userAgent,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[CueX PWA] Failed to save subscription via edge function:', err);
    return false;
  }
}

// ─── Request Notification Permission + Subscribe Admin ────────────────────
export async function setupPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  try {
    const sub = await getOrRenewSubscription(reg);
    if (sub) {
      await saveSubscriptionToBackend(sub, 'admin');
    }
    return sub;
  } catch (err) {
    console.error('[CueX PWA] Admin push subscription failed:', err);
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
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        action: 'notify',
        target: 'admin',
      }),
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
    const sub = await getOrRenewSubscription(reg);
    if (sub) {
      await saveSubscriptionToBackend(sub, 'customer', phone);
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
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(PUSH_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        action: 'notify',
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
  await setupPushSubscription();

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
