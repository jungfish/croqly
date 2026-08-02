import type { Recipe } from '@/types/recipe';
import { authFetch } from '@/lib/apiClient';

export type HouseholdMember = {
  userId: string;
  email: string | null;
  joinedAt: string;
  isMe: boolean;
};

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

// A recipe returned by GET /api/recipes/household, attributed to whoever in
// the household saved it.
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

export async function fetchMyHousehold(): Promise<Household | null> {
  const response = await authFetch('/api/household/me');
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch household');
  const { household } = await response.json();
  return household;
}

export async function fetchHouseholdRecipes(): Promise<HouseholdRecipe[]> {
  const response = await authFetch('/api/recipes/household');
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch household recipes');
  return response.json();
}

export async function toggleReaction(savedRecipeId: string, emoji: string): Promise<ReactionSummary[]> {
  const response = await authFetch(`/api/recipes/saved/${savedRecipeId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji }),
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

export async function renameHousehold(name: string): Promise<string | null> {
  const response = await authFetch('/api/household', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to rename household');
  const { name: updatedName } = await response.json();
  return updatedName;
}

export async function joinHousehold(code: string): Promise<void> {
  const response = await authFetch('/api/household/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to join household');
}

export async function leaveHousehold(): Promise<void> {
  const response = await authFetch('/api/household/leave', { method: 'POST' });
  if (!response.ok) return parseErrorOr(response, 'Failed to leave household');
}

export async function regenerateInviteCode(): Promise<string> {
  const response = await authFetch('/api/household/regenerate-code', { method: 'POST' });
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
