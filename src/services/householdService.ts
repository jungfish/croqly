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

// A recipe returned by GET /api/recipes/household, attributed to whoever in
// the household saved it.
export type HouseholdRecipe = Recipe & {
  savedByUserId: string;
  savedByEmail: string | null;
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
