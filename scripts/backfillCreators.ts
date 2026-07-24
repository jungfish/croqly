// One-off backfill: recipes created before the Creator model (see
// prisma/migrations/20260722093827_add_creator) have no creatorId. This
// re-fetches each one's owner info via the same fetchers the live pipeline
// uses (server/routes/recipes.ts) and links it retroactively.
// Run with: npx tsx scripts/backfillCreators.ts
import { prisma } from '../server/lib/prisma.js';
import { instagramFetcher } from '../server/lib/instagramFetcher.js';
import { tiktokFetcher } from '../server/lib/tiktokFetcher.js';

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { creatorId: null, url: { not: null } },
  });

  console.log(`Found ${recipes.length} recipe(s) with no creator to backfill.`);

  for (const recipe of recipes) {
    try {
      if (recipe.platform !== 'instagram' && recipe.platform !== 'tiktok') {
        console.log(`- ${recipe.id} (${recipe.title}): no supported platform, skipping.`);
        continue;
      }

      const fetcher = recipe.platform === 'tiktok' ? tiktokFetcher : instagramFetcher;
      const media = await fetcher.getMediaByUrl(recipe.url!);
      if (!media.ownerUsername) {
        console.log(`- ${recipe.id} (${recipe.title}): no owner username returned, skipping.`);
        continue;
      }

      const creator = await prisma.creator.upsert({
        where: { platform_handle: { platform: recipe.platform, handle: media.ownerUsername } },
        create: {
          platform: recipe.platform,
          handle: media.ownerUsername,
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
