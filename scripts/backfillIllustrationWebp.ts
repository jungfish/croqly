// One-off backfill: recipes created before WebP conversion (see
// prisma/migrations/20260724073459_add_illustration_thumb and
// server/lib/storage.ts) have their illustration stored as an uncompressed
// full-size PNG, with no thumbnail variant. This re-downloads each one's
// current illustration and re-uploads it as WebP full/thumb variants.
// Run with: npx tsx scripts/backfillIllustrationWebp.ts
import { prisma } from '../server/lib/prisma.js';
import { uploadIllustrationVariants } from '../server/lib/storage.js';

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { illustration: { not: null }, illustrationPending: false, illustrationThumb: null },
  });

  console.log(`Found ${recipes.length} recipe(s) to convert to WebP.`);

  for (const recipe of recipes) {
    try {
      const response = await fetch(recipe.illustration!);
      if (!response.ok) {
        console.log(`- ${recipe.id} (${recipe.title}): failed to fetch source image (${response.status}), skipping.`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      const { full, thumb } = await uploadIllustrationVariants(buffer, `${recipe.id}-${recipe.title.slice(0, 40)}`);
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { illustration: full, illustrationThumb: thumb },
      });

      console.log(`- ${recipe.id} (${recipe.title}): converted.`);
    } catch (error) {
      console.error(`- ${recipe.id} (${recipe.title}): failed —`, (error as Error).message);
    }
  }

  await prisma.$disconnect();
}

main();
