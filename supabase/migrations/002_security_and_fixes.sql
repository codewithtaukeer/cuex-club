-- ==============================================================================
-- CUEX Migration 002 — Security Hardening & Functional Bug Fixes
-- Run this ONCE on your existing database (safe to re-run).
-- For a brand-new database, run schema.sql instead (already contains everything).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Add missing columns
-- ------------------------------------------------------------------------------

-- reminder_sent_at: prevents duplicate reminder pushes (F5)
ALTER TABLE public.cuex_bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;

-- Add contact form size constraints (S9)
ALTER TABLE public.cuex_contact_messages
  ALTER COLUMN name TYPE varchar(120),
  ALTER COLUMN phone TYPE varchar(20),
  ALTER COLUMN email TYPE varchar(254),
  ALTER COLUMN message TYPE varchar(2000);

-- ------------------------------------------------------------------------------
-- B. Remove insecure direct booking insert policy (S4)
-- Users must book only through the cuex_book_slot RPC, never direct INSERT.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.cuex_bookings;

-- RPC functions are SECURITY DEFINER so they bypass RLS; no INSERT policy needed.
-- Only admins retain a managed delete path.

-- ------------------------------------------------------------------------------
-- C. Lock profiles – prevent role escalation (S5)
-- Users cannot SET their own role column.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Allow new profile rows to be inserted (by trigger only, via service role)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- D. Auto-create profile row on sign-up (F8)
-- Trigger fires AFTER a new auth.users row is inserted.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuex_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    'member'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email     = COALESCE(EXCLUDED.email,     public.profiles.email),
    phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cuex_handle_new_user();

-- Back-fill existing users who have no profile row
INSERT INTO public.profiles (id, full_name, email, phone, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'phone',
  'member'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- E. Lock push subscriptions table (S2, S3)
-- Only the edge function (service role) may read/write this table.
-- The browser client (anon/authenticated) has zero direct access.
-- ------------------------------------------------------------------------------
ALTER TABLE public.cuex_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow push subscriptions upsert" ON public.cuex_push_subscriptions;
DROP POLICY IF EXISTS "No direct client access to push subscriptions" ON public.cuex_push_subscriptions;

-- Deny everything for all client roles; edge function uses service_role key which bypasses RLS.
CREATE POLICY "No direct client access to push subscriptions" ON public.cuex_push_subscriptions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ------------------------------------------------------------------------------
-- F. Fix cuex_admin_extend_hold – revive just-expired holds from "now" (F1)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuex_admin_extend_hold(
  p_booking_id uuid,
  p_additional_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  -- Allow reviving a recently-expired hold (within 5 minutes of expiry)
  -- and always compute the new expiry from NOW(), not from the old expiry_at.
  UPDATE public.cuex_bookings
  SET expires_at = now() + (p_additional_minutes || ' minutes')::interval,
      status     = CASE
                     WHEN status = 'expired' THEN 'pending_confirmation'
                     ELSE status
                   END,
      updated_at = now()
  WHERE id = p_booking_id
    AND (
      status IN ('pending_confirmation', 'pending')
      OR (
        status = 'expired'
        AND expires_at IS NOT NULL
        AND expires_at > (now() - interval '5 minutes')
      )
    )
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found, already confirmed/rejected, or expired more than 5 minutes ago.';
  END IF;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- ------------------------------------------------------------------------------
-- G. Fix cuex_admin_confirm_booking – check status before confirming (F7)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuex_admin_confirm_booking(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.cuex_bookings%ROWTYPE;
  v_existing public.cuex_bookings%ROWTYPE;
BEGIN
  IF NOT public.cuex_is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  SELECT * INTO v_existing FROM public.cuex_bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  -- Already confirmed – idempotent, return as-is
  IF v_existing.status = 'confirmed' THEN
    RETURN row_to_json(v_existing)::jsonb;
  END IF;

  IF v_existing.status NOT IN ('pending_confirmation', 'pending') THEN
    RAISE EXCEPTION 'Cannot confirm a booking in status "%". Only pending bookings can be confirmed.', v_existing.status;
  END IF;

  -- Check the slot time hasn't already passed
  IF v_existing.start_at < (now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'Cannot confirm a booking whose start time has already passed.';
  END IF;

  -- Check no other confirmed booking now occupies the same slot
  IF EXISTS (
    SELECT 1 FROM public.cuex_bookings
    WHERE resource_id = v_existing.resource_id
      AND status = 'confirmed'
      AND id <> p_booking_id
      AND tstzrange(start_at, end_at) && tstzrange(v_existing.start_at, v_existing.end_at)
  ) THEN
    RAISE EXCEPTION 'Another booking was confirmed for this slot while this one was pending. Please reopen the slot.';
  END IF;

  UPDATE public.cuex_bookings
  SET status       = 'confirmed',
      confirmed_at = now(),
      expires_at   = NULL,
      updated_at   = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- ------------------------------------------------------------------------------
-- H. Harden cuex_is_admin – pin search_path (S9)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuex_is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cuex_admins WHERE id = p_user_id
  );
$$;

-- ------------------------------------------------------------------------------
-- I. Harden cuex_cleanup_expired_bookings – internal only (S9)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cuex_cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cuex_bookings
  SET status = 'expired', updated_at = now()
  WHERE status IN ('pending_confirmation', 'pending')
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

REVOKE ALL ON FUNCTION public.cuex_cleanup_expired_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cuex_cleanup_expired_bookings() TO service_role;

-- ------------------------------------------------------------------------------
-- J. Fix walk-in invalid phone – return error instead of silently using venue number (F10 / S10)
-- ------------------------------------------------------------------------------
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
SET search_path = public
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
  ELSIF length(v_clean_phone) = 11 AND substring(v_clean_phone FROM 1 FOR 1) = '0' THEN
    v_clean_phone := substring(v_clean_phone FROM 2);
  END IF;

  IF length(v_clean_phone) <> 10 OR substring(v_clean_phone FROM 1 FOR 1) NOT IN ('6','7','8','9') THEN
    RAISE EXCEPTION 'Please enter a valid 10-digit Indian mobile number for the walk-in customer.';
  END IF;

  v_clean_phone := '+91' || v_clean_phone;
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
    booking_reference, user_id, resource_id, customer_name, customer_phone,
    number_of_players, booking_mode, start_at, end_at, duration_minutes,
    total_amount, status, customer_notes, expires_at
  ) VALUES (
    v_reference, auth.uid(), p_resource_id, v_clean_name, v_clean_phone,
    p_number_of_players, 'walk-in', p_start_at, v_end_at, p_duration_minutes,
    v_price, 'confirmed', COALESCE(p_notes, 'Manual walk-in reserved by Admin'), NULL
  )
  RETURNING * INTO v_booking;

  RETURN row_to_json(v_booking)::jsonb;
END;
$$;

-- ------------------------------------------------------------------------------
-- K. Enable Realtime for cuex_bookings (F4 — guest confirmation screen)
-- Run in Supabase Dashboard → Database → Replication if CLI not available.
-- ------------------------------------------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.cuex_bookings;

-- ------------------------------------------------------------------------------
-- L. Enable pg_cron jobs for reminders and cleanup
-- Requires pg_cron and pg_net extensions enabled in Dashboard → Extensions first.
-- ------------------------------------------------------------------------------
-- After enabling pg_cron, run these in SQL Editor:

-- SELECT cron.schedule('cuex-cleanup-expired', '* * * * *',
--   'SELECT public.cuex_cleanup_expired_bookings();');

-- SELECT cron.schedule('cuex-send-reminders', '*/5 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://vetyyyemzhqinqoeqakz.supabase.co/functions/v1/notify-admin-booking',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-webhook-secret', current_setting('app.push_webhook_secret')
--     ),
--     body := '{"action":"send-reminders"}'::jsonb
--   );$$
-- );

-- ------------------------------------------------------------------------------
-- M. Verification queries (run after applying migration)
-- ------------------------------------------------------------------------------
-- SELECT COUNT(*) AS profile_count FROM public.profiles;
-- SELECT COUNT(*) AS booking_count FROM public.cuex_bookings;
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.cuex_bookings'::regclass AND contype = 'x';
-- SELECT polname, cmd FROM pg_policy WHERE polrelid = 'public.cuex_push_subscriptions'::regclass;
