// Single hardcoded admin allowlist — no role system exists yet, and one
// admin doesn't warrant building one. Add emails here if that changes.
const ADMIN_EMAILS = ['matjungfer@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
