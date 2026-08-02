// The fixed cast of 11 illustrated kitchen-character avatars offered at
// signup (see AvatarPseudoPicker.tsx) — curated on purpose rather than a
// free upload, so the set stays fun and consistent. Assets live as static
// SVGs in /public/avatars/ (not imported through the bundler) so they can be
// swapped/added without a code change. Kept in sync with VALID_AVATAR_KEYS
// in server/lib/randomProfile.ts, which is the actual source of truth/
// validation for what the server will accept — same "curated list
// duplicated client + server" pattern as ALLOWED_REACTION_EMOJIS.
export const AVATAR_KEYS = [
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

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const AVATAR_OPTIONS: { key: AvatarKey; name: string; role: string; tag: string }[] = [
  { key: 'bocuse', name: 'Chef Bocuse', role: 'Le Maître', tag: 'Légende' },
  { key: 'ratatouille', name: 'Ratatouille', role: 'Le Goûteur', tag: 'Malin' },
  { key: 'commis', name: 'Le Commis', role: "L'Apprenti", tag: 'Débutant' },
  { key: 'tattoo', name: 'Chef Tattoo', role: 'Le Rebelle', tag: 'Street' },
  { key: 'kebabie', name: 'Le Kebabié', role: 'Le Sage de la Broche', tag: 'Nocturne' },
  { key: 'pizzaiolo', name: 'Il Pizzaiolo', role: 'Le Maestro', tag: 'Passione' },
  { key: 'casanova', name: 'Casanova', role: 'Le Séducteur', tag: 'Romantique' },
  { key: 'sushi', name: 'Maître Sushi', role: 'Le Silencieux', tag: 'Précision' },
  { key: 'patissiere', name: 'La Pâtissière', role: 'La Douceur', tag: 'Gourmand' },
  { key: 'grillmaster', name: 'Grillmaster', role: 'Le Flambeur', tag: 'Fumé' },
  { key: 'mamie', name: 'Mamie', role: 'La Cheffe de Clan', tag: 'Intraitable' },
];

export function isAvatarKey(value: string | null | undefined): value is AvatarKey {
  return !!value && (AVATAR_KEYS as readonly string[]).includes(value);
}

export function avatarSrc(key: string): string {
  return `/avatars/${isAvatarKey(key) ? key : AVATAR_KEYS[0]}.svg`;
}
