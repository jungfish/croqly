import { supabase } from './supabaseClient';

// fetch() wrapper that attaches the current Supabase session as a Bearer
// token when one exists — omitted entirely for anonymous callers, since
// most of the API works fine (or gracefully degrades) without an identity.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
