// One-off backfill: accounts created before pseudo/avatar existed (see
// prisma/migrations/20260802231500_add_profile) have no Profile row.
// Assigns each a random pseudo + avatar via the same generator GET
// /api/profile/me uses to self-heal a straggler account — so both paths
// stay consistent. Anyone can change their own afterwards from the app.
// Run with: npx tsx scripts/backfillProfiles.ts
import { prisma } from '../server/lib/prisma.js';
import { getSupabaseAdmin } from '../server/lib/supabaseAdmin.js';
import { createRandomProfileForUser } from '../server/lib/randomProfile.js';

async function main() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured — aborting.');
    process.exit(1);
  }

  const existingProfiles = await prisma.profile.findMany({ select: { userId: true } });
  const hasProfile = new Set(existingProfiles.map((p) => p.userId));

  let page = 1;
  const perPage = 200;
  let created = 0;
  let scanned = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (data.users.length === 0) break;

    for (const user of data.users) {
      scanned += 1;
      if (hasProfile.has(user.id)) continue;
      const profile = await createRandomProfileForUser(user.id);
      created += 1;
      console.log(`- ${user.id} (${user.email ?? 'no email'}): assigned ${profile.pseudo} / ${profile.avatarKey}`);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  console.log(`Scanned ${scanned} account(s), created ${created} new profile(s).`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
