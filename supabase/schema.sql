-- ==============================================================================
-- CUEX - POOL | SNOOKER | CAFE (PRAYAGRAJ, UP)
-- COMPLETE PRODUCTION SUPABASE DATABASE SCHEMA & RPC SUITE
-- ==============================================================================
-- Includes:
-- 1. Required Postgres Extensions (uuid-ossp, btree_gist)
-- 2. Tables & Constraints (with Exclusion Constraint to eliminate double-booking)
-- 3. Row Level Security (RLS) Policies (strict role-based security)
-- 4. Transactional RPC Functions (atomic booking, availability, admin workflow)
-- 5. Auto-Confirmation Trigger on auth.users (zero email-quota dependency)
-- 6. Automated Expiry & Maintenance Functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ------------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- ------------------------------------------------------------------------------

-- 2.1 User Profiles (Member records linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2 CueX Admins Gatekeeper (Strict server-side admin list)
CREATE TABLE IF NOT EXISTS public.cuex_admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2.3 Facilities & Tables (3 Core Resources: PS5, Pool, Snooker)
CREATE TABLE IF NOT EXISTS public.cuex_resources (
  id text PRIMARY KEY, -- 'ps5', 'pool', 'snooker'
  name text NOT NULL,
  category text NOT NULL,
  description text,
  hourly_rate numeric NOT NULL DEFAULT 120,
  is_active boolean NOT NULL DEFAULT true,
  pricing_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2.4 Venue Operating Hours (8:00 AM to 3:00 AM next day)
CREATE TABLE IF NOT EXISTS public.cuex_opening_hours (
  id serial PRIMARY KEY,
  day_of_week integer NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
  is_closed boolean NOT NULL DEFAULT false,
  open_time time NOT NULL DEFAULT '08:00:00',
  close_time time NOT NULL DEFAULT '03:00:00'
);

-- 2.5 Venue Business Settings (Anti-Abuse & Hold Configuration)
CREATE TABLE IF NOT EXISTS public.cuex_venue_settings (
  id text PRIMARY KEY DEFAULT 'cuex_main',
  venue_name text NOT NULL DEFAULT 'CueX',
  venue_phone text NOT NULL DEFAULT '+916394149768',
  temp_hold_minutes integer NOT NULL DEFAULT 15,
  max_pending_per_customer integer NOT NULL DEFAULT 1,
  max_active_per_customer integer NOT NULL DEFAULT 2,
  turnstile_enabled boolean NOT NULL DEFAULT false,
  advance_booking_days integer NOT NULL DEFAULT 7,
  cancellation_lead_hours integer NOT NULL DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.6 Maintenance & Blocked Periods
CREATE TABLE IF NOT EXISTS public.cuex_blocked_periods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id text REFERENCES public.cuex_resources(id) ON DELETE CASCADE, -- NULL = all resources
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT 'Scheduled Maintenance',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cuex_blocked_time_order CHECK (end_at > start_at)
);

-- 2.7 Reservations & Bookings
CREATE TABLE IF NOT EXISTS public.cuex_bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_id text NOT NULL REFERENCES public.cuex_resources(id),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  number_of_players integer NOT NULL DEFAULT 1,
  booking_mode text NOT NULL DEFAULT 'hourly', -- 'hourly', 'match', 'walk-in'
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending_confirmation',
  -- 'pending_confirmation', 'confirmed', 'rejected', 'cancelled', 'expired', 'completed', 'no_show'
  customer_notes text,
  rejection_reason text,
  expires_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cuex_booking_time_order CHECK (end_at > start_at)
);

-- Exclusion constraint to mathematically prevent double-booking of confirmed slots
ALTER TABLE public.cuex_bookings
DROP CONSTRAINT IF EXISTS cuex_no_confirmed_overlap;

ALTER TABLE public.cuex_bookings
ADD CONSTRAINT cuex_no_confirmed_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (status = 'confirmed');

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_cuex_bookings_resource_range 
  ON public.cuex_bookings (resource_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_cuex_bookings_customer_phone 
  ON public.cuex_bookings (customer_phone);

CREATE INDEX IF NOT EXISTS idx_cuex_bookings_status_expires 
  ON public.cuex_bookings (status, expires_at);

-- 2.8 Contact Form Enquiries
CREATE TABLE IF NOT EXISTS public.cuex_contact_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. INITIAL SEED DATA
-- ------------------------------------------------------------------------------

-- Seed Resources
INSERT INTO public.cuex_resources (id, name, category, description, hourly_rate, is_active, pricing_details)
VALUES 
  ('pool', 'English Pool Table', 'Billiards', '60-minute standard or 30-minute quick match slots on high-precision green baize.', 120, true, '{"hourly": 120, "match": 40, "per_game": 40}'::jsonb),
  ('snooker', 'Championship Snooker Table', 'Snooker', 'Tournament-standard snooker table with overhead directional lighting.', 360, true, '{"hourly": 360, "match": 120, "frame": 120}'::jsonb),
  ('ps5', 'PS5 Gaming Station', 'Console Gaming', 'Ultra-HD gaming station with DualSense wireless controllers and next-gen titles.', 149, true, '{"single_player": 149, "two_players": 249}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  hourly_rate = EXCLUDED.hourly_rate,
  pricing_details = EXCLUDED.pricing_details;

-- Seed Operating Hours (8:00 AM - 3:00 AM Late Night for all 7 days)
INSERT INTO public.cuex_opening_hours (day_of_week, is_closed, open_time, close_time)
VALUES
  (0, false, '08:00:00', '03:00:00'),
  (1, false, '08:00:00', '03:00:00'),
  (2, false, '08:00:00', '03:00:00'),
  (3, false, '08:00:00', '03:00:00'),
  (4, false, '08:00:00', '03:00:00'),
  (5, false, '08:00:00', '03:00:00'),
  (6, false, '08:00:00', '03:00:00')
ON CONFLICT (day_of_week) DO UPDATE SET
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  is_closed = EXCLUDED.is_closed;

-- Seed Settings
INSERT INTO public.cuex_venue_settings (id, venue_name, venue_phone, temp_hold_minutes, max_pending_per_customer, max_active_per_customer)
VALUES ('cuex_main', 'CueX Lounge', '+916394149768', 15, 1, 2)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_venue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_blocked_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuex_contact_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is an admin
CREATE OR REPLACE FUNCTION public.cuex_is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cuex_admins WHERE id = p_user_id
  );
$$;

-- RLS: cuex_admins
DROP POLICY IF EXISTS "Admins can view admins" ON public.cuex_admins;
CREATE POLICY "Admins can view admins" ON public.cuex_admins
  FOR SELECT USING (id = auth.uid() OR public.cuex_is_admin());

-- RLS: profiles
DROP POLICY IF EXISTS "Users view own profile or admins" ON public.profiles;
CREATE POLICY "Users view own profile or admins" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.cuex_is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- RLS: cuex_resources (Public read, admin write)
DROP POLICY IF EXISTS "Public can view active resources" ON public.cuex_resources;
CREATE POLICY "Public can view active resources" ON public.cuex_resources
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage resources" ON public.cuex_resources;
CREATE POLICY "Admins can manage resources" ON public.cuex_resources
  FOR ALL USING (public.cuex_is_admin());

-- RLS: cuex_opening_hours (Public read, admin write)
DROP POLICY IF EXISTS "Public can view opening hours" ON public.cuex_opening_hours;
CREATE POLICY "Public can view opening hours" ON public.cuex_opening_hours
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage opening hours" ON public.cuex_opening_hours;
CREATE POLICY "Admins can manage opening hours" ON public.cuex_opening_hours
  FOR ALL USING (public.cuex_is_admin());

-- RLS: cuex_venue_settings (Public read, admin write)
DROP POLICY IF EXISTS "Public can view venue settings" ON public.cuex_venue_settings;
CREATE POLICY "Public can view venue settings" ON public.cuex_venue_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update venue settings" ON public.cuex_venue_settings;
CREATE POLICY "Admins can update venue settings" ON public.cuex_venue_settings
  FOR ALL USING (public.cuex_is_admin());

-- RLS: cuex_blocked_periods (Public read, admin write)
DROP POLICY IF EXISTS "Public can view blocked periods" ON public.cuex_blocked_periods;
CREATE POLICY "Public can view blocked periods" ON public.cuex_blocked_periods
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage blocked periods" ON public.cuex_blocked_periods;
CREATE POLICY "Admins can manage blocked periods" ON public.cuex_blocked_periods
  FOR ALL USING (public.cuex_is_admin());

-- RLS: cuex_bookings
-- Users can view ONLY their own bookings. Admins can view all. Public cannot scrape table.
DROP POLICY IF EXISTS "Users and admins can view bookings" ON public.cuex_bookings;
CREATE POLICY "Users and admins can view bookings" ON public.cuex_bookings
  FOR SELECT USING ((auth.uid() = user_id) OR public.cuex_is_admin());

-- Users can insert their own bookings (guests allowed via RPC)
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.cuex_bookings;
CREATE POLICY "Users can insert own bookings" ON public.cuex_bookings
  FOR INSERT WITH CHECK ((user_id = auth.uid()) OR public.cuex_is_admin());

-- Strictly Admins can UPDATE bookings (cancellations/approvals)
DROP POLICY IF EXISTS "Only admins can update bookings" ON public.cuex_bookings;
CREATE POLICY "Only admins can update bookings" ON public.cuex_bookings
  FOR UPDATE USING (public.cuex_is_admin());

-- Strictly Admins can DELETE bookings
DROP POLICY IF EXISTS "Admins full management on bookings" ON public.cuex_bookings;
CREATE POLICY "Admins full management on bookings" ON public.cuex_bookings
  FOR DELETE USING (public.cuex_is_admin());

-- RLS: cuex_contact_messages (Anyone can submit, only admin can view)
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.cuex_contact_messages;
CREATE POLICY "Public can submit contact messages" ON public.cuex_contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact messages" ON public.cuex_contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.cuex_contact_messages
  FOR SELECT USING (public.cuex_is_admin());

-- ------------------------------------------------------------------------------
-- 5. BUSINESS LOGIC & RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- 5.1 Calculate Pricing
CREATE OR REPLACE FUNCTION public.cuex_calculate_price(
  p_resource_id text,
  p_duration_minutes integer,
  p_number_of_players integer DEFAULT 1,
  p_booking_mode text DEFAULT 'hourly'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_res record;
  v_hourly numeric;
  v_match numeric;
BEGIN
  SELECT hourly_rate, pricing_details INTO v_res
  FROM public.cuex_resources
  WHERE id = p_resource_id;

  IF p_resource_id = 'ps5' THEN
    IF p_number_of_players >= 2 THEN
      RETURN CASE WHEN p_duration_minutes >= 120 THEN 349 ELSE 249 END;
    ELSE
      RETURN CASE WHEN p_duration_minutes >= 120 THEN 249 ELSE 149 END;
    END IF;
  ELSIF p_resource_id = 'pool' THEN
    v_hourly := COALESCE(v_res.hourly_rate, 120);
    v_match := COALESCE((v_res.pricing_details->>'match')::numeric, 40);
    
    IF p_booking_mode = 'match' OR p_duration_minutes <= 30 THEN
      RETURN v_match;
    ELSIF p_duration_minutes >= 120 THEN
      RETURN v_hourly * 2;
    ELSE
      RETURN v_hourly;
    END IF;
  ELSIF p_resource_id = 'snooker' THEN
    v_hourly := COALESCE(v_res.hourly_rate, 360);
    v_match := COALESCE((v_res.pricing_details->>'match')::numeric, 120);
    
    IF p_booking_mode = 'match' OR p_duration_minutes <= 30 THEN
      RETURN v_match;
    ELSIF p_duration_minutes >= 120 THEN
      RETURN v_hourly * (p_duration_minutes / 60.0);
    ELSE
      RETURN v_hourly;
    END IF;
  ELSE
    RETURN 120;
  END IF;
END;
$$;

-- 5.2 Cleanup Expired Pending Bookings
CREATE OR REPLACE FUNCTION public.cuex_cleanup_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.cuex_bookings
  SET status = 'expired',
      updated_at = now()
  WHERE status IN ('pending_confirmation', 'pending')
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5.3 Fetch Availability Slots (8:00 AM to 3:00 AM next day)
CREATE OR REPLACE FUNCTION public.cuex_get_resource_availability(
  p_resource_id text,
  p_date date,
  p_duration_minutes integer DEFAULT 60
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end timestamptz,
  slot_status text,
  calculated_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week integer;
  v_open_time time;
  v_close_time time;
  v_is_closed boolean;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_close_boundary timestamptz;
  v_step interval;
  v_status text;
  v_price numeric;
BEGIN
  PERFORM public.cuex_cleanup_expired_bookings();

  v_day_of_week := extract(DOW FROM p_date);

  SELECT oh.is_closed, oh.open_time, oh.close_time
  INTO v_is_closed, v_open_time, v_close_time
  FROM public.cuex_opening_hours oh
  WHERE oh.day_of_week = v_day_of_week;

  IF NOT FOUND OR v_is_closed THEN
    RETURN;
  END IF;

  v_slot_start := (p_date || ' ' || v_open_time)::timestamp AT TIME ZONE 'Asia/Kolkata';

  -- Overnight boundary handler: if close_time <= open_time (03:00 <= 08:00), extends past midnight
  IF v_close_time <= v_open_time THEN
    v_close_boundary := ((p_date + interval '1 day')::date || ' ' || v_close_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
  ELSE
    v_close_boundary := (p_date || ' ' || v_close_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
  END IF;

  v_step := (p_duration_minutes || ' minutes')::interval;

  WHILE ((v_slot_start + v_step) <= v_close_boundary) LOOP
    v_slot_end := v_slot_start + v_step;
    v_status := 'available';

    IF v_slot_start < now() THEN
      v_status := 'past';
    ELSIF EXISTS (
      SELECT 1 FROM public.cuex_blocked_periods bp
      WHERE (bp.resource_id IS NULL OR bp.resource_id = p_resource_id)
        AND tstzrange(bp.start_at, bp.end_at) && tstzrange(v_slot_start, v_slot_end)
    ) THEN
      v_status := 'blocked';
    ELSIF EXISTS (
      SELECT 1 FROM public.cuex_bookings b
      WHERE b.resource_id = p_resource_id
        AND (
          b.status = 'confirmed'
          OR (
            b.status IN ('pending_confirmation', 'pending')
            AND (b.expires_at IS NULL OR b.expires_at > now())
          )
        )
        AND tstzrange(b.start_at, b.end_at) && tstzrange(v_slot_start, v_slot_end)
    ) THEN
      v_status := 'booked';
    END IF;

    v_price := public.cuex_calculate_price(p_resource_id, p_duration_minutes, 1, 'hourly');

    slot_start := v_slot_start;
    slot_end := v_slot_end;
    slot_status := v_status;
    calculated_price := v_price;
    RETURN NEXT;

    IF p_duration_minutes <= 30 THEN
      v_slot_start := v_slot_start + interval '30 minutes';
    ELSE
      v_slot_start := v_slot_start + interval '60 minutes';
    END IF;
  END LOOP;
END;
$$;

-- 5.4 Atomic Customer Booking with Row-Level Locking & Anti-Abuse
CREATE OR REPLACE FUNCTION public.cuex_book_slot(
  p_resource_id text,
  p_start_at timestamptz,
  p_duration_minutes integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_number_of_players integer DEFAULT 1,
  p_booking_mode text DEFAULT 'hourly',
  p_customer_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resource public.cuex_resources%ROWTYPE;
  v_settings public.cuex_venue_settings%ROWTYPE;
  v_end_at timestamptz;
  v_price numeric;
  v_status text;
  v_reference text;
  v_new_booking public.cuex_bookings%ROWTYPE;
  v_user_id uuid;
  v_clean_phone text;
  v_clean_name text;
  v_pending_count integer;
  v_active_count integer;
  v_noshow_count integer;
  v_expires_at timestamptz;
  v_hold_minutes integer;
  v_is_admin boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    v_is_admin := public.cuex_is_admin(v_user_id);
  END IF;

  v_clean_name := trim(p_customer_name);
  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Please enter a valid full name (at least 2 characters).';
  END IF;

  v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
  IF length(v_clean_phone) = 12 AND substring(v_clean_phone FROM 1 FOR 2) = '91' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  ELSIF length(v_clean_phone) = 11 AND substring(v_clean_phone FROM 1 FOR 1) = '0' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  IF length(v_clean_phone) <> 10 OR substring(v_clean_phone FROM 1 FOR 1) NOT IN ('6', '7', '8', '9') THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit Indian mobile number.';
  END IF;

  v_clean_phone := '+91' || v_clean_phone;

  IF p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid duration specified.';
  END IF;

  v_end_at := p_start_at + (p_duration_minutes || ' minutes')::interval;

  IF p_start_at < (now() - interval '2 minutes') THEN
    RAISE EXCEPTION 'Cannot book a slot in the past.';
  END IF;

  PERFORM public.cuex_cleanup_expired_bookings();

  SELECT * INTO v_settings FROM public.cuex_venue_settings LIMIT 1;
  v_hold_minutes := COALESCE(v_settings.temp_hold_minutes, 15);

  -- Anti-Abuse Protections (Per-customer limits)
  IF NOT v_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM public.cuex_bookings
      WHERE (
        customer_phone = v_clean_phone
        OR (v_user_id IS NOT NULL AND user_id = v_user_id)
      )
      AND created_at > (now() - interval '15 seconds')
    ) THEN
      RAISE EXCEPTION 'Please wait a moment before submitting another booking request.';
    END IF;

    SELECT count(*) INTO v_pending_count
    FROM public.cuex_bookings
    WHERE (
      customer_phone = v_clean_phone
      OR (v_user_id IS NOT NULL AND user_id = v_user_id)
    )
    AND status IN ('pending_confirmation', 'pending')
    AND (expires_at IS NULL OR expires_at > now());

    IF v_pending_count >= COALESCE(v_settings.max_pending_per_customer, 1) THEN
      RAISE EXCEPTION 'A booking request is already pending for mobile % awaiting CueX confirmation.', v_clean_phone;
    END IF;

    SELECT count(*) INTO v_active_count
    FROM public.cuex_bookings
    WHERE (
      customer_phone = v_clean_phone
      OR (v_user_id IS NOT NULL AND user_id = v_user_id)
    )
    AND status = 'confirmed'
    AND start_at > now();

    IF v_active_count >= COALESCE(v_settings.max_active_per_customer, 2) THEN
      RAISE EXCEPTION 'This mobile number already has active upcoming reservations. Please complete them first.';
    END IF;

    SELECT count(*) INTO v_noshow_count
    FROM public.cuex_bookings
    WHERE (
      customer_phone = v_clean_phone
      OR (v_user_id IS NOT NULL AND user_id = v_user_id)
    )
    AND status = 'no_show';

    IF v_noshow_count >= 3 THEN
      RAISE EXCEPTION 'Multiple past no-shows are recorded for this number. Please call CueX directly at +91 6394149768.';
    END IF;
  END IF;

  -- Row-level locking on resource to prevent concurrent race condition
  SELECT * INTO v_resource
  FROM public.cuex_resources
  WHERE id = p_resource_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_resource.is_active THEN
    RAISE EXCEPTION 'Facility is currently inactive.';
  END IF;

  -- Overlap verification
  IF EXISTS (
    SELECT 1 FROM public.cuex_blocked_periods
    WHERE (resource_id IS NULL OR resource_id = p_resource_id)
      AND tstzrange(start_at, end_at) && tstzrange(p_start_at, v_end_at)
  ) THEN
    RAISE EXCEPTION 'This slot is blocked for maintenance or a private event.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuex_bookings
    WHERE resource_id = p_resource_id
      AND (
        status = 'confirmed'
        OR (
          status IN ('pending_confirmation', 'pending')
          AND (expires_at IS NULL OR expires_at > now())
        )
      )
      AND tstzrange(start_at, end_at) && tstzrange(p_start_at, v_end_at)
  ) THEN
    RAISE EXCEPTION 'This slot was just selected by another player. Please choose another time.';
  END IF;

  v_price := public.cuex_calculate_price(p_resource_id, p_duration_minutes, p_number_of_players, p_booking_mode);
  v_status := 'pending_confirmation';
  v_expires_at := now() + (v_hold_minutes || ' minutes')::interval;

  LOOP
    v_reference := 'CX-' || (floor(10000 + random() * 90000))::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cuex_bookings WHERE booking_reference = v_reference);
  END LOOP;

  INSERT INTO public.cuex_bookings (
    booking_reference,
    user_id,
    resource_id,
    customer_name,
    customer_phone,
    customer_email,
    number_of_players,
    booking_mode,
    start_at,
    end_at,
    duration_minutes,
    total_amount,
    status,
    customer_notes,
    expires_at
  ) VALUES (
    v_reference,
    v_user_id,
    p_resource_id,
    v_clean_name,
    v_clean_phone,
    trim(p_customer_email),
    p_number_of_players,
    p_booking_mode,
    p_start_at,
    v_end_at,
    p_duration_minutes,
    v_price,
    v_status,
    p_customer_notes,
    v_expires_at
  )
  RETURNING * INTO v_new_booking;

  RETURN row_to_json(v_new_booking)::jsonb;
END;
$$;

-- 5.5 Admin Confirm Booking
CREATE OR REPLACE FUNCTION public.cuex_admin_confirm_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  UPDATE public.cuex_bookings
  SET status = 'confirmed',
      confirmed_at = now(),
      expires_at = NULL,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- 5.6 Admin Reject Booking
CREATE OR REPLACE FUNCTION public.cuex_admin_reject_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  UPDATE public.cuex_bookings
  SET status = 'rejected',
      rejection_reason = p_reason,
      expires_at = NULL,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- 5.7 Admin Extend Hold
CREATE OR REPLACE FUNCTION public.cuex_admin_extend_hold(p_booking_id uuid, p_additional_minutes integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  UPDATE public.cuex_bookings
  SET expires_at = COALESCE(expires_at, now()) + (p_additional_minutes || ' minutes')::interval,
      updated_at = now()
  WHERE id = p_booking_id
    AND status IN ('pending_confirmation', 'pending')
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or not currently pending.';
  END IF;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- 5.8 Admin Re-open Slot (Strict collision defense)
CREATE OR REPLACE FUNCTION public.cuex_admin_reopen_slot(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
  v_resource public.cuex_resources%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT * INTO v_booking FROM public.cuex_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  SELECT * INTO v_resource FROM public.cuex_resources WHERE id = v_booking.resource_id FOR UPDATE;

  IF v_booking.end_at < now() THEN
    RAISE EXCEPTION 'Cannot re-open a slot that has already passed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuex_blocked_periods
    WHERE (resource_id IS NULL OR resource_id = v_booking.resource_id)
      AND tstzrange(start_at, end_at) && tstzrange(v_booking.start_at, v_booking.end_at)
  ) THEN
    RAISE EXCEPTION 'Cannot re-open: this time slot is blocked for maintenance.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuex_bookings
    WHERE resource_id = v_booking.resource_id
      AND id <> v_booking.id
      AND (
        status = 'confirmed'
        OR (
          status IN ('pending_confirmation', 'pending')
          AND (expires_at IS NULL OR expires_at > now())
        )
      )
      AND tstzrange(start_at, end_at) && tstzrange(v_booking.start_at, v_booking.end_at)
  ) THEN
    RAISE EXCEPTION 'Cannot re-open: this slot has since been booked by another reservation.';
  END IF;

  UPDATE public.cuex_bookings
  SET status = 'confirmed',
      expires_at = NULL,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- 5.9 Admin Manual Walk-in Booking
CREATE OR REPLACE FUNCTION public.cuex_admin_manual_book(
  p_resource_id text,
  p_start_at timestamptz,
  p_duration_minutes integer,
  p_customer_name text,
  p_customer_phone text,
  p_total_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_number_of_players integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resource public.cuex_resources%ROWTYPE;
  v_end_at timestamptz;
  v_clean_phone text;
  v_clean_name text;
  v_price numeric;
  v_reference text;
  v_booking public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  v_clean_name := COALESCE(nullif(trim(p_customer_name), ''), 'Walk-in Customer');
  v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
  IF length(v_clean_phone) = 12 AND substring(v_clean_phone FROM 1 FOR 2) = '91' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  END IF;
  IF length(v_clean_phone) = 10 THEN
    v_clean_phone := '+91' || v_clean_phone;
  ELSE
    v_clean_phone := '+916394149768';
  END IF;

  v_end_at := p_start_at + (p_duration_minutes || ' minutes')::interval;

  SELECT * INTO v_resource FROM public.cuex_resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource % not found.', p_resource_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuex_blocked_periods
    WHERE (resource_id IS NULL OR resource_id = p_resource_id)
      AND tstzrange(start_at, end_at) && tstzrange(p_start_at, v_end_at)
  ) THEN
    RAISE EXCEPTION 'Cannot book: slot is blocked for maintenance or a private event.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cuex_bookings
    WHERE resource_id = p_resource_id
      AND (
        status = 'confirmed'
        OR (
          status IN ('pending_confirmation', 'pending')
          AND (expires_at IS NULL OR expires_at > now())
        )
      )
      AND tstzrange(start_at, end_at) && tstzrange(p_start_at, v_end_at)
  ) THEN
    RAISE EXCEPTION 'Cannot book: this time slot is already reserved by another player.';
  END IF;

  IF p_total_amount IS NOT NULL AND p_total_amount >= 0 THEN
    v_price := p_total_amount;
  ELSE
    v_price := public.cuex_calculate_price(p_resource_id, p_duration_minutes, p_number_of_players, 'hourly');
  END IF;

  LOOP
    v_reference := 'CX-W' || (floor(10000 + random() * 90000))::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cuex_bookings WHERE booking_reference = v_reference);
  END LOOP;

  INSERT INTO public.cuex_bookings (
    booking_reference,
    user_id,
    resource_id,
    customer_name,
    customer_phone,
    number_of_players,
    booking_mode,
    start_at,
    end_at,
    duration_minutes,
    total_amount,
    status,
    customer_notes,
    expires_at
  ) VALUES (
    v_reference,
    auth.uid(),
    p_resource_id,
    v_clean_name,
    v_clean_phone,
    p_number_of_players,
    'walk-in',
    p_start_at,
    v_end_at,
    p_duration_minutes,
    v_price,
    'confirmed',
    COALESCE(p_notes, 'Manual walk-in reserved by Admin'),
    NULL
  )
  RETURNING * INTO v_booking;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- 5.10 Secure Guest Bookings Lookup (Protects database from scraping)
CREATE OR REPLACE FUNCTION public.cuex_lookup_guest_bookings(
  p_phone text, 
  p_booking_ref text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  booking_reference text,
  resource_id text,
  customer_name text,
  customer_phone text,
  start_at timestamptz,
  end_at timestamptz,
  duration_minutes integer,
  total_amount numeric,
  status text,
  number_of_players integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_phone text;
  v_clean_ref text;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
  IF length(v_clean_phone) = 12 AND substring(v_clean_phone FROM 1 FOR 2) = '91' THEN
    v_clean_phone := substring(v_clean_phone FROM 3);
  ELSIF length(v_clean_phone) = 11 AND substring(v_clean_phone FROM 1 FOR 1) = '0' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  IF length(v_clean_phone) <> 10 THEN
    RETURN;
  END IF;

  v_clean_phone := '+91' || v_clean_phone;
  v_clean_ref := trim(upper(COALESCE(p_booking_ref, '')));

  IF v_clean_ref <> '' THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.booking_reference,
      b.resource_id,
      b.customer_name,
      b.customer_phone,
      b.start_at,
      b.end_at,
      b.duration_minutes,
      b.total_amount,
      b.status,
      b.number_of_players,
      b.created_at
    FROM public.cuex_bookings b
    WHERE b.customer_phone = v_clean_phone
      AND upper(b.booking_reference) = v_clean_ref
    ORDER BY b.start_at DESC;
  ELSE
    RETURN QUERY
    SELECT 
      b.id,
      b.booking_reference,
      b.resource_id,
      b.customer_name,
      b.customer_phone,
      b.start_at,
      b.end_at,
      b.duration_minutes,
      b.total_amount,
      b.status,
      b.number_of_players,
      b.created_at
    FROM public.cuex_bookings b
    WHERE b.customer_phone = v_clean_phone
    ORDER BY b.start_at DESC
    LIMIT 20;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. AUTH AUTO-CONFIRM TRIGGER (Supabase Free-Tier Zero-Email Solution)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_auto_confirm'
  ) THEN
    CREATE TRIGGER on_auth_user_created_auto_confirm
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_auto_confirm_user();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. SCHEDULED EXPIRY MAINTENANCE (pg_cron setup)
-- ------------------------------------------------------------------------------
-- To enable continuous automated expiry cleanup every minute in Supabase:
-- Enable pg_cron in Supabase Database -> Extensions, then run:
-- SELECT cron.schedule(
--   'cuex-cleanup-expired-every-minute',
--   '* * * * *',
--   'SELECT public.cuex_cleanup_expired_bookings();'
-- );

-- ------------------------------------------------------------------------------
-- 8. WEB PUSH NOTIFICATIONS & REAL-TIME ALERTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cuex_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone text,
  role text DEFAULT 'admin', -- 'admin' | 'customer'
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuex_push_phone ON public.cuex_push_subscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_cuex_push_role ON public.cuex_push_subscriptions(role);

ALTER TABLE public.cuex_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow push subscriptions upsert" ON public.cuex_push_subscriptions;
CREATE POLICY "Allow push subscriptions upsert"
  ON public.cuex_push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable pg_net for asynchronous database webhooks
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Automated trigger function to notify admin on new booking requests
CREATE OR REPLACE FUNCTION public.cuex_trigger_notify_admin_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res_name text;
BEGIN
  IF NEW.status IN ('pending_confirmation', 'pending') THEN
    SELECT name INTO v_res_name FROM public.cuex_resources WHERE id = NEW.resource_id;

    PERFORM net.http_post(
      url := 'https://vetyyyemzhqinqoeqakz.supabase.co/functions/v1/notify-admin-booking',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'title', '🎱 New CueX Booking Request!',
        'body', NEW.customer_name || ' (' || NEW.customer_phone || ') requested ' || COALESCE(v_res_name, NEW.resource_id) || ' for ₹' || NEW.total_amount,
        'url', '/admin-app?tab=pending',
        'tag', 'cuex-booking-' || NEW.id::text
      )::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cuex_booking_inserted_notify ON public.cuex_bookings;
CREATE TRIGGER on_cuex_booking_inserted_notify
  AFTER INSERT ON public.cuex_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.cuex_trigger_notify_admin_booking();

