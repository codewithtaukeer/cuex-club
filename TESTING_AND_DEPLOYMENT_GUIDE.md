# CueX — Full Testing, Database & Deployment Guide

This document contains everything needed to verify, test, deploy, and audit the **CueX Pool, Snooker & PS5 Gaming Lounge** platform.

---

## 1. System Architecture

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS | High-performance SPA with zero-lag routing & dark luxury UI |
| **Backend / DB** | Supabase (PostgreSQL 17) | Atomic RPC procedures, Row-Level Security, audit logs |
| **Push Engine** | Supabase Edge Functions (Deno) + VAPID | Instant background web push to Android/iOS with app closed |
| **Offline / PWA** | Service Worker v4 + WebAPK | Home screen install, offline shell, background notifications |
| **Hosting** | Cloudflare Workers / Pages | Edge CDN, SPA fallback routing (`single-page-application`) |

---

## 2. Database Setup & SQL Migration

The complete database schema is located at:
📁 **`supabase/schema.sql`**

### What It Contains:
1. **Core Tables**:
   - `cuex_resources` (Pool, Snooker, PS5 station records and active states)
   - `cuex_bookings` (Customer reservations with status, amount, holds, timestamps)
   - `cuex_opening_hours` (Day-by-day venue operating schedules)
   - `cuex_venue_settings` (Hold duration, customer limits, phone, address)
   - `cuex_blocked_periods` (Maintenance slots, holidays, full-day venue closures)
   - `cuex_admins` (Strict database-level admin whitelist)
   - `cuex_push_subscriptions` (Registered Android/iOS push endpoints for Admins and Customers)
2. **Row-Level Security (RLS)**:
   - Full RLS enabled on all tables.
   - Public key can only query availability and submit sanitized bookings.
   - Admin operations (`cuex_admin_*`) are restricted to verified admin IDs.
3. **Atomic Stored Procedures (RPCs)**:
   - `cuex_book_slot`: Row-level locking (`FOR UPDATE`) to prevent concurrent double-booking race conditions.
   - `cuex_get_resource_availability`: Computes free/held/booked time slots.
   - `cuex_admin_confirm_booking`: Confirms reservation and triggers real-time customer push.
   - `cuex_admin_reject_booking`: Declines reservation and frees slot immediately.
   - `cuex_admin_manual_book`: Admin walk-in booking with collision detection.
   - `cuex_admin_reopen_slot`: Validates slot collision before re-opening cancelled slots.
   - `cuex_lookup_guest_bookings`: Sanitized customer booking lookup by mobile number.
   - `cuex_cleanup_expired_bookings`: Automates release of 15-minute temporary holds.
4. **Real-time Push Webhook Trigger**:
   - `on_cuex_booking_inserted_notify`: Asynchronous PostgreSQL trigger via `pg_net` that alerts admin devices on new booking requests.

### How to Apply to a Fresh Supabase Project:
1. Open your Supabase Dashboard → **SQL Editor**.
2. Paste the contents of `supabase/schema.sql`.
3. Click **Run**.
4. To enable automated hold cleanup every minute, enable the `pg_cron` extension and run:
   ```sql
   SELECT cron.schedule('cuex-cleanup-expired-every-minute', '* * * * *', 'SELECT public.cuex_cleanup_expired_bookings();');
   ```

---

## 3. Environment Configuration (`.env`)

```env
VITE_SUPABASE_URL=https://vetyyyemzhqinqoeqakz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZldHl5eWVtemhxaW5xb2VxYWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzA2OTYsImV4cCI6MjEwNzY0NjY5Nn0.xJnXjekIYjzw1QRP9MkFFfku6NPzfePgGwyy6mR1QoI
VITE_VAPID_PUBLIC_KEY=BETjBu9ielhfbIVwiiX-4KrxcxkfqhNPMDSeBEGUsytXrurVANe91AApv4eNLMFKYEb1hnnEhoz9oBfU5ZfTF5k
```

---

## 4. Edge Functions (Push Notification Server)

Source code:
📁 **`supabase/functions/notify-admin-booking/index.ts`**

### Supported Actions:
- `action: "subscribe"`: Registers a push subscription with phone number & role (`admin` or `customer`).
- `action: "notify"`: Dispatches targeted push notifications to admins or customers via Web Push (VAPID).
- `action: "send-reminders"`: Automated cron/webhook to send 1-hour advance reminders to players with upcoming confirmed games.

---

## 5. QA & Verification Test Matrix

| ID | Test Scenario | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **TC-01** | Customer books a Pool slot (1 Game / ₹40) | ₹40 charged, CX-reference generated, 15-min hold starts | ✅ Verified |
| **TC-02** | Customer books Snooker (1 Hour / ₹360) | ₹360 charged, slot locked in database | ✅ Verified |
| **TC-03** | Customer books PS5 (2 Players 1 Hour / ₹249) | ₹249 rate applied correctly | ✅ Verified |
| **TC-04** | Admin opens Phone App (`/admin-app`) | Auto-authenticates, registers for background Web Push | ✅ Verified |
| **TC-05** | Customer submits booking request | Admin phone vibrates and rings even with browser closed | ✅ Verified |
| **TC-06** | Admin types phone number in Manual Walk-in | **Keyboard remains open** continuously across digits (no focus loss) | ✅ Fixed & Verified |
| **TC-07** | Admin views "Hourly Slots" in Bookings tab | Color-coded 8 AM–3 AM slot view with Call/WhatsApp/Pass actions | ✅ Verified |
| **TC-08** | Admin marks date closed with existing bookings | System warns of booking conflicts before proceeding | ✅ Verified |
| **TC-09** | Admin re-opens closed date | Club status reverts to OPEN immediately | ✅ Verified |
| **TC-10** | Refresh `/my-bookings` in Chrome | Loads cleanly with `200 OK` (Zero `ERR_FAILED` or 307 redirects) | ✅ Fixed & Verified |
| **TC-11** | Customer taps "Get Match Reminders" | Phone subscribed for 1-hour pre-match alert | ✅ Verified |
| **TC-12** | Admin confirms booking | Customer phone receives instant confirmation notification | ✅ Verified |

---

## 6. Local Development & Production Build

### Run locally:
```powershell
npm install
npm run dev
```

### Build for production:
```powershell
npm run build
```
*(Produces static output in `dist/` with native `404.html` and SPA routing assets).*

### Deploy to Cloudflare:
```powershell
npx wrangler deploy
```

---

## 7. Android App / APK Distribution

### Method A: Native WebAPK (1-Tap Install)
1. Open the live site in Chrome on Android (`https://cuex-club.taukeerakbar-code.workers.dev`).
2. Tap the **"Install CueX App"** banner or Chrome menu (⋮) → **"Install App"**.
3. Android compiles and installs a signed **WebAPK** onto the phone with full-screen experience and push alerts.

### Method B: Standalone `.apk` File
1. Visit **[PWABuilder.com](https://www.pwabuilder.com/)**.
2. Enter `https://cuex-club.taukeerakbar-code.workers.dev`.
3. Tap **"Package for Android"** to download the signed `.apk` file for direct distribution.
