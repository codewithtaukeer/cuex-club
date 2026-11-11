# CueX — Pool | Snooker | Cafe
### Premium Gaming & Hangout Destination — Prayagraj, Uttar Pradesh, India

A bespoke, production-ready, mobile-first web application and real-time reservation platform built for **CueX — Pool | Snooker | Cafe**.

---

## 🎱 1. Brand & Business Details

- **Brand Name:** CueX
- **Brand Subtitle:** POOL | SNOOKER | CAFE
- **Location:** Mehdhauri, near Mother's Pride School, Teliyarganj, Prayagraj (Allahabad), Uttar Pradesh, India
- **Contact Number:** `+91 6394149768`
- **WhatsApp Link:** [wa.me/916394149768](https://wa.me/916394149768)
- **Official Google Maps Directions:** [https://maps.app.goo.gl/Q4A223yN6kVchHxJ6](https://maps.app.goo.gl/Q4A223yN6kVchHxJ6)
- **Official Instagram:** [https://www.instagram.com/_cue.x_?psln=emRnd3lpOGYwaGlo](https://www.instagram.com/_cue.x_?psln=emRnd3lpOGYwaGlo)

---

## 🎮 2. Gaming Facilities & Official Rates

CueX has exactly **THREE independently bookable setups**:

1. **PS5 Gaming Station** (1 PlayStation 5 4K Station with DualSense Controllers)
   - **Single Player:** 1 Hour: ₹149 | 2 Hours: ₹249
   - **2 Players:** 1 Hour: ₹249 | 2 Hours: ₹349
2. **English Pool Table** (Tournament English Pool Table with Emerald Felt)
   - **Table Booking:** ₹120 for 1 Hour
   - **Per Match:** ₹60 for 1 Match (30 mins)
3. **Championship Snooker Table** (Full-size Championship Snooker Table with Directional Lighting)
   - **Table Booking:** ₹120 for 1 Hour
   - **Per Match:** ₹60 for 1 Match (30 mins)

*Note: Payments are collected directly at the venue.*

---

## 🚀 3. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React, Canvas Confetti
- **Backend & Database:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Supabase Realtime, PostgreSQL RPC Functions with atomic locking
- **Timezone:** Standardized on `Asia/Kolkata` (IST)
- **Hosting:** Vercel (SPA rewrite rules configured via `vercel.json`)

---

## 🔐 4. Authentication & Security Highlights

- **Mandatory Customer Login:** Per business guidelines, guest users cannot view real availability or create reservations.
- **Intent Preservation:** When an unauthenticated visitor clicks "Book Pool", they are routed to Login/Signup, and upon successful authentication, they are immediately returned to the Pool booking flow.
- **Strict Row Level Security (RLS):**
  - Public visitors can view active resources, venue information, and submit contact messages.
  - Authenticated customers can query date availability and manage only their own bookings.
  - Public queries never expose customer phone numbers, names, or private booking records.
  - Authorized administrators have full access to manage reservations, pricing, opening hours, and maintenance blocks.
- **Double Booking Prevention:** Handled atomically in PostgreSQL (`cuex_book_slot` function with row-level locks and time-range collision checks).

---

## 🛠️ 5. Local Setup & Development

1. Clone or open the project directory:
   ```bash
   cd CueX
   ```

2. Ensure `.env` is configured:
   ```env
   VITE_SUPABASE_URL=https://vetyyyemzhqinqoeqakz.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Run production build:
   ```bash
   npm run build
   ```

---

## 🛡️ 6. Admin Access & Owner Console

- Protected URL: `/admin`
- Authorized Accounts: Pre-configured for administrators in `cuex_admins` (e.g. `admin@nexus.io`).
- Features available to the owner:
  - Daily & monthly booking statistics
  - Live filterable bookings table (Today, Tomorrow, Status, Facility)
  - One-click Confirm, Reject, Complete, and Cancel actions
  - Direct WhatsApp & Phone call links for every booked customer
  - Maintenance Slot Blocker (block single table or full lounge with custom reason)
  - Toggle facilities on/off
  - Export all booking history as CSV

---

## 📱 7. Mobile-First Experience

- Thumb-friendly navigation overlay
- Sticky bottom booking CTA ("SIGN IN TO BOOK" / "BOOK YOUR GAME")
- Touch-optimized step-by-step reservation wizard:
  `Game → Date & Mode → Slot → Confirm & Done`
- Fast loading with WebP/AVIF compressed assets and route-level code splitting.
