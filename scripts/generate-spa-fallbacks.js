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

// List of all SPA client-side routes
const spaRoutes = [
  'admin',
  'admin-app',
  'booking',
  'availability',
  'gallery',
  'about',
  'contact',
  'auth',
  'my-bookings',
];

console.log('[CueX Fallbacks] Generating static directory fallbacks for SPA routes...');

// 1. Create dist/404.html so static hosts that fall back to 404.html render the SPA
const fallback404Path = path.join(distDir, '404.html');
fs.writeFileSync(fallback404Path, indexHtml, 'utf-8');
console.log('  ✓ Created dist/404.html');

// 2. Create index.html inside each route directory
for (const route of spaRoutes) {
  const routeDir = path.join(distDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  const routeIndexPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(routeIndexPath, indexHtml, 'utf-8');
  console.log(`  ✓ Created dist/${route}/index.html`);
}

console.log('[CueX Fallbacks] All SPA routes now have native static fallbacks. Zero 404 guarantee!');
