import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa'

// Auto-recover from stale chunks after a new deployment or temporary network hiccup
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[CueX] Chunk preload error detected; reloading to fetch latest version...', event);
  const lastReload = sessionStorage.getItem('cuex_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem('cuex_chunk_reload', String(now));
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || '';
  if (
    typeof msg === 'string' &&
    (msg.includes('Failed to fetch dynamically imported module') ||
     msg.includes('Importing a module script failed'))
  ) {
    console.warn('[CueX] Dynamic script load failed; refreshing application...');
    const lastReload = sessionStorage.getItem('cuex_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem('cuex_chunk_reload', String(now));
      window.location.reload();
    }
  }
});

// Register PWA service worker for background notifications and offline capabilities
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
