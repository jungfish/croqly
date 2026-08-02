import type { Recipe } from '@/types/recipe';
import { authFetch } from '@/lib/apiClient';

export type HouseholdMember = {
  userId: string;
  email: string | null;
  joinedAt: string;
  isMe: boolean;
};

// A "bande" — a user can belong to several at once (e.g. one with family,
// one with friends), each with its own members, invite code, and recipe feed.
export type Household = {
  id: string;
  name: string | null;
  inviteCode: string;
  members: HouseholdMember[];
};

// Slack-style curated set for reactions on a bande's shared recipes — kept
// in sync with ALLOWED_REACTION_EMOJIS in server/routes/recipes.ts, which is
// the actual source of truth/validation (this copy is UI-only).
export const REACTION_EMOJIS = ['😋', '🤤', '😍', '👍', '🔥', '❤️'] as const;

export type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };

// A recipe returned by GET /api/recipes/household/:id, attributed to
// whoever in that bande saved it. Reactions are scoped to this specific
// bande (see Reaction.householdId server-side).
export type HouseholdRecipe = Recipe & {
  savedRecipeId: string;
  savedByUserId: string;
  savedByEmail: string | null;
  savedAt: string;
  reactions: ReactionSummary[];
};

async function parseErrorOr(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallback);
}

// Every bande the caller belongs to.
export async function fetchMyHouseholds(): Promise<Household[]> {
  const response = await authFetch('/api/household');
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch households');
  const { households } = await response.json();
  return households;
}

export async function fetchHouseholdRecipes(householdId: string): Promise<HouseholdRecipe[]> {
  const response = await authFetch(`/api/recipes/household/${householdId}`);
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch household recipes');
  return response.json();
}

export async function toggleReaction(householdId: string, savedRecipeId: string, emoji: string): Promise<ReactionSummary[]> {
  const response = await authFetch(`/api/recipes/saved/${savedRecipeId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji, householdId }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to toggle reaction');
  const { reactions } = await response.json();
  return reactions;
}

export async function createHousehold(name?: string): Promise<Household> {
  const response = await authFetch('/api/household', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to create household');
  const { household } = await response.json();
  return household;
}

export async function renameHousehold(householdId: string, name: string): Promise<string | null> {
  const response = await authFetch(`/api/household/${householdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to rename household');
  const { name: updatedName } = await response.json();
  return updatedName;
}

// Returns the joined household so the caller can switch straight to it.
export async function joinHousehold(code: string): Promise<Household> {
  const response = await authFetch('/api/household/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to join household');
  const { household } = await response.json();
  return household;
}

export async function leaveHousehold(householdId: string): Promise<void> {
  const response = await authFetch(`/api/household/${householdId}/leave`, { method: 'POST' });
  if (!response.ok) return parseErrorOr(response, 'Failed to leave household');
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  const response = await authFetch(`/api/household/${householdId}/regenerate-code`, { method: 'POST' });
  if (!response.ok) return parseErrorOr(response, 'Failed to regenerate invite code');
  const { inviteCode } = await response.json();
  return inviteCode;
}

// Shared by every "Inviter" entry point (the panel's button, the empty-state
// nudge) so the invite copy/link only lives in one place. navigator.share
// opens the native share sheet (WhatsApp, Messages...) so inviting someone
// doesn't require reading a code aloud — same pattern as ShareButton.tsx.
// Falls back to a plain clipboard copy on desktop/unsupported browsers.
export async function shareInviteLink(inviteCode: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = `${window.location.origin}/bande?join=${inviteCode}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Rejoins ma bande sur Croqly',
        text: `Rejoins ma bande sur Croqly avec le code ${inviteCode}`,
        url,
      });
      return 'shared';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
