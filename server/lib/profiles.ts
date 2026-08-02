import { prisma } from './prisma.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

export type ProfileInfo = { email: string | null; pseudo: string | null; avatarKey: string | null };

// The single seam every route that needs to show "who" (a bande member, a
// dressage submitter, a commenter...) resolves through — combines the email
// (Supabase auth, since there's no local Users table) with the pseudo/avatar
// (this app's own Profile table). Replaces the resolveEmails helper that
// used to be duplicated across server/routes/household.ts,
// platingChallenges.ts, recipes.ts and shoppingList.ts.
export async function resolveProfiles(userIds: string[]): Promise<Map<string, ProfileInfo>> {
  const infoById = new Map<string, ProfileInfo>();
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return infoById;

  const [profiles, supabaseAdmin] = [await prisma.profile.findMany({ where: { userId: { in: uniqueIds } } }), getSupabaseAdmin()];
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

  await Promise.all(
    uniqueIds.map(async (id) => {
      let email: string | null = null;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        email = data?.user?.email ?? null;
      }
      const profile = profileByUserId.get(id);
      infoById.set(id, { email, pseudo: profile?.pseudo ?? null, avatarKey: profile?.avatarKey ?? null });
    })
  );
  return infoById;
}

export async function resolveProfile(userId: string): Promise<ProfileInfo> {
  const map = await resolveProfiles([userId]);
  return map.get(userId) ?? { email: null, pseudo: null, avatarKey: null };
}
