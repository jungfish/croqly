import { createClient } from '@supabase/supabase-js';

// Browser client — uses the public anon key (safe to expose), never the
// service role key. Handles Auth (signup/login/OAuth session) only; all
// data access still goes through our own /api/* endpoints.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
