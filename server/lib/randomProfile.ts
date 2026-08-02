import crypto from 'crypto';
import { prisma } from './prisma.js';

// Kept in sync with AVATAR_KEYS in src/lib/avatars.ts, which is the
// UI-facing copy (this one is the actual source of truth/validation) — same
// "curated list duplicated client + server" pattern as
// ALLOWED_REACTION_EMOJIS in server/routes/recipes.ts.
export const VALID_AVATAR_KEYS = [
  'bocuse',
  'ratatouille',
  'commis',
  'tattoo',
  'kebabie',
  'pizzaiolo',
  'casanova',
  'sushi',
  'patissiere',
  'grillmaster',
  'mamie',
] as const;

const PSEUDO_WORDS = [
  'Croqueur',
  'Gourmand',
  'Marmiton',
  'Fourchette',
  'Toqué',
  'Gourmet',
  'Croquant',
  'Popote',
  'Fondant',
  'Croustillant',
];

function randomPseudo(): string {
  const word = PSEUDO_WORDS[crypto.randomInt(PSEUDO_WORDS.length)];
  const suffix = crypto.randomInt(100, 1000);
  return `${word}${suffix}`;
}

export function randomAvatarKey(): string {
  return VALID_AVATAR_KEYS[crypto.randomInt(VALID_AVATAR_KEYS.length)];
}

// Assigns a random pseudo + avatar to an account that has none — used both
// by the one-off backfill (scripts/backfillProfiles.ts, for accounts that
// predate this feature) and as a lazy self-heal in GET /api/profile/me (e.g.
// a Google OAuth signup, which has no step-2 picker moment). Retried a few
// times on the rare pseudo collision, same pattern as generateInviteCode in
// server/routes/household.ts.
export async function createRandomProfileForUser(userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.profile.create({
        data: { userId, pseudo: randomPseudo(), avatarKey: randomAvatarKey() },
      });
    } catch (error) {
      const isUniqueConstraintError =
        typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
      if (isUniqueConstraintError) continue;
      throw error;
    }
  }
  throw new Error(`Failed to create a random profile for user ${userId} after 5 attempts`);
}
