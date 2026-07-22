// One-off backfill: recipes created before the Creator model (see
// prisma/migrations/20260722093827_add_creator) have no creatorId. This
// re-fetches each one's Instagram owner info via the same fetcher the
// live pipeline uses (server/routes/recipes.ts) and links it retroactively.
// Run with: npx tsx scripts/backfillCreators.ts
import { prisma } from '../server/lib/prisma.js';
import { instagramFetcher } from '../server/lib/instagramFetcher.js';

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { creatorId: null, url: { not: null } },
  });

  console.log(`Found ${recipes.length} recipe(s) with no creator to backfill.`);

  for (const recipe of recipes) {
    try {
      const media = await instagramFetcher.getMediaByUrl(recipe.url!);
      if (!media.ownerUsername) {
        console.log(`- ${recipe.id} (${recipe.title}): no owner username returned, skipping.`);
        continue;
      }

      const creator = await prisma.creator.upsert({
        where: { instagramHandle: media.ownerUsername },
        create: {
          instagramHandle: media.ownerUsername,
          displayName: media.ownerFullName,
          avatarUrl: media.ownerProfilePicUrl,
        },
        update: {
          displayName: media.ownerFullName,
          avatarUrl: media.ownerProfilePicUrl,
        },
      });

      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { creatorId: creator.id },
      });

      console.log(`- ${recipe.id} (${recipe.title}): linked to @${media.ownerUsername}`);
    } catch (error) {
      console.error(`- ${recipe.id} (${recipe.title}): failed —`, (error as Error).message);
    }
  }

  await prisma.$disconnect();
}

main();
