import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('[CueX Fallbacks] dist directory does not exist! Run build first.');
  process.exit(1);
}

const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('[CueX Fallbacks] dist/index.html not found!');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// 1. Create dist/404.html for static servers that fall back to 404.html
const fallback404Path = path.join(distDir, '404.html');
fs.writeFileSync(fallback404Path, indexHtml, 'utf-8');
console.log('[CueX Fallbacks] ✓ Created dist/404.html (SPA Fallback)');

// Note: We deliberately do NOT create physical subdirectories (e.g. dist/my-bookings/index.html)
// because web servers and Cloudflare interpret directories as needing 307 trailing-slash redirects,
// which breaks Service Worker navigation in browsers. wrangler.jsonc handles SPA routing natively.
