import type { User } from '@supabase/supabase-js';

// first_name is set at signup (see Signup.tsx / use-auth.tsx); given_name/
// full_name/name come from Google OAuth instead, whose shape we don't
// control — falls back through whichever one is actually present.
export function getFirstName(user: User | null | undefined): string | null {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  if (!metadata) return null;

  const firstName = metadata.first_name ?? metadata.given_name;
  if (typeof firstName === 'string' && firstName.trim()) return firstName.trim();

  const fullName = metadata.full_name ?? metadata.name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim().split(/\s+/)[0];

  return null;
}
