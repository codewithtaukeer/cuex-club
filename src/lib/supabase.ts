import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL: Supabase environment variables missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or deployment environment settings.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
