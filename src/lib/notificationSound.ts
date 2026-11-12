// WhatsApp-style notification sound generator and audio manager using Web Audio API
// Works reliably across mobile (iOS Safari, Android Chrome) and desktop (Chrome, Edge, Firefox, Safari)

let globalAudioCtx: AudioContext | null = null;

// Get or create shared AudioContext
function getAudioContext(): AudioContext | null {
  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or blocked:', e);
    return null;
  }
}

// Unlock audio on first touch/click anywhere on page
export function primeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Auto-register touch/click listener on window
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    primeAudioContext();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
}

/**
 * Plays an authentic WhatsApp-style two-tone incoming chime
 * Note 1: Bright G5 (784 Hz)
 * Note 2: Crisp High C6 (1046.5 Hz) with harmonic sparkle
 */
export function playWhatsAppSound(volume: number = 0.8): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime;

    // --- NOTE 1: 784 Hz (G5) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, startTime);
    
    // Add harmonic overtone for marimba/bell brightness
    const osc1Harmonic = ctx.createOscillator();
    const gain1Harmonic = ctx.createGain();
    osc1Harmonic.type = 'triangle';
    osc1Harmonic.frequency.setValueAtTime(1568, startTime); // 2nd harmonic

    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(volume * 0.45, startTime + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

    gain1Harmonic.gain.setValueAtTime(0.001, startTime);
    gain1Harmonic.gain.linearRampToValueAtTime(volume * 0.18, startTime + 0.015);
    gain1Harmonic.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

    osc1.connect(gain1);
    osc1Harmonic.connect(gain1Harmonic);
    gain1.connect(ctx.destination);
    gain1Harmonic.connect(ctx.destination);

    osc1.start(startTime);
    osc1Harmonic.start(startTime);
    osc1.stop(startTime + 0.19);
    osc1Harmonic.stop(startTime + 0.19);

    // --- NOTE 2: 1046.5 Hz (High C6) - typical cheerful WhatsApp chime ---
    const note2Time = startTime + 0.11;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, note2Time);

    const osc2Harmonic = ctx.createOscillator();
    const gain2Harmonic = ctx.createGain();
    osc2Harmonic.type = 'triangle';
    osc2Harmonic.frequency.setValueAtTime(2093, note2Time); // 2nd harmonic

    gain2.gain.setValueAtTime(0.001, note2Time);
    gain2.gain.linearRampToValueAtTime(volume * 0.55, note2Time + 0.018);
    gain2.gain.exponentialRampToValueAtTime(0.0001, note2Time + 0.6);

    gain2Harmonic.gain.setValueAtTime(0.001, note2Time);
    gain2Harmonic.gain.linearRampToValueAtTime(volume * 0.22, note2Time + 0.018);
    gain2Harmonic.gain.exponentialRampToValueAtTime(0.0001, note2Time + 0.45);

    osc2.connect(gain2);
    osc2Harmonic.connect(gain2Harmonic);
    gain2.connect(ctx.destination);
    gain2Harmonic.connect(ctx.destination);

    osc2.start(note2Time);
    osc2Harmonic.start(note2Time);
    osc2.stop(note2Time + 0.65);
    osc2Harmonic.stop(note2Time + 0.65);

    // Trigger mobile vibration if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 220]);
      } catch {}
    }
  } catch (err) {
    console.error('Error playing WhatsApp notification tone:', err);
  }
}

/**
 * Request browser desktop/mobile notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Display native browser notification if allowed
 */
export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      const notif = new Notification(title, {
        icon: '/assets/cuex-logo.png',
        badge: '/assets/cuex-logo.png',
        silent: true, // We already play our authentic WhatsApp sound tone!
        ...options,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch {}
}
