import { toast } from 'sonner';
import { shareInviteLink } from '@/services/householdService';

// Shows a member's email prefix rather than the full address — enough to
// recognize "who's who" in a small group without spelling out emails.
export function memberLabel(email: string | null, isMe: boolean): string {
  if (isMe) return 'Toi';
  if (!email) return 'Membre';
  return email.split('@')[0];
}

// Recipes list is already ordered by savedAt desc (see GET /api/recipes/household/:id),
// so newest-first is a given — this badge just makes "someone in the bande
// just added this" visible at a glance instead of requiring a mental diff
// against the last visit.
const NEW_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000;
export function isRecentlySaved(savedAt: string): boolean {
  return Date.now() - new Date(savedAt).getTime() < NEW_BADGE_WINDOW_MS;
}

// Shared by every "Inviter" entry point (the switcher's "+", the panel
// button, the solo-bande nudge, the empty-recipes CTA) so the toast/error
// handling only lives once.
export async function handleInviteClick(inviteCode: string) {
  try {
    const result = await shareInviteLink(inviteCode);
    if (result === 'copied') toast.success("Lien d'invitation copié !");
  } catch {
    toast.error('Impossible de partager. Réessaie dans un instant.');
  }
}
