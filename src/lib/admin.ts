import type { User } from '@supabase/supabase-js';

// Client-side mirror of server/lib/admin.ts — this only gates the UI
// (hiding the nav link, redirecting off /admin); the real enforcement is
// the requireAdmin middleware on every /api/admin/* route.
const ADMIN_EMAILS = ['matjungfer@gmail.com'];

export function isAdminUser(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}
