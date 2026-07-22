import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side only client using the service role key — never expose this key
// or import this module from anything that ships to the browser.
//
// Lazily constructed so the server can still boot (and serve the public,
// unauthenticated routes) before SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are
// configured in .env — attachUser just treats every request as anonymous
// until then, rather than crashing the process.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}
