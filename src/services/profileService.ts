import { authFetch } from '@/lib/apiClient';
import type { AvatarKey } from '@/lib/avatars';

export type Profile = { pseudo: string; avatarKey: AvatarKey };

async function parseErrorOr(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallback);
}

// Self-healing on the server side (see GET /api/profile/me) — this never
// resolves to null for a signed-in user, even one created before this
// feature existed or via Google OAuth (which skips the Signup.tsx step-2
// picker entirely).
export async function fetchMyProfile(): Promise<Profile> {
  const response = await authFetch('/api/profile/me');
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch profile');
  const { profile } = await response.json();
  return profile;
}

export async function saveMyProfile(pseudo: string, avatarKey: AvatarKey): Promise<Profile> {
  const response = await authFetch('/api/profile/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, avatarKey }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to save profile');
  const { profile } = await response.json();
  return profile;
}
