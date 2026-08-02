// One-off: sets a specific, friendly pseudo for a handful of known accounts
// (matched by email local-part) instead of the random one the backfill/
// self-heal path would otherwise assign — requested 2026-08-02 for Matthieu's
// own household. Looks the account up directly in Supabase's own "auth"
// schema (same Postgres database, via DATABASE_URL) rather than the Supabase
// Admin JS API, since this only needs read access to auth.users, not a
// service-role key. Keeps an existing avatar if the account already has a
// profile; assigns a random one only if it doesn't.
// Run with: npx tsx scripts/setProfilePseudos.ts
import { prisma } from '../server/lib/prisma.js';
import { randomAvatarKey } from '../server/lib/randomProfile.js';

const PSEUDO_BY_EMAIL_LOCAL_PART: Record<string, string> = {
  matjungfer: 'matthieu',
  'violette.dedeban': 'violette',
  'mathilde.': 'mathilde',
};

async function main() {
  const users = await prisma.$queryRawUnsafe<{ id: string; email: string }[]>(
    `select id, email from auth.users where email is not null`
  );

  const remaining = new Set(Object.keys(PSEUDO_BY_EMAIL_LOCAL_PART));

  for (const user of users) {
    const localPart = user.email.split('@')[0];
    const match = Array.from(remaining).find((key) => localPart === key || localPart.startsWith(key));
    if (!match) continue;

    const pseudo = PSEUDO_BY_EMAIL_LOCAL_PART[match];
    const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: { pseudo },
      create: { userId: user.id, pseudo, avatarKey: randomAvatarKey() },
    });
    console.log(`- ${user.email}: pseudo -> "${profile.pseudo}"${existing ? '' : ` (new profile, avatar ${profile.avatarKey})`}`);
    remaining.delete(match);
  }

  if (remaining.size > 0) {
    console.warn(`No account found for: ${Array.from(remaining).join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error('setProfilePseudos failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
