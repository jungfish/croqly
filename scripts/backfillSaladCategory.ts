// One-off backfill: "Salade" was added as a recipe category after several
// salad recipes had already been imported under "Entrée"/"Plat principal".
// This reclassifies existing recipes whose title says otherwise.
// Run with: npx tsx scripts/backfillSaladCategory.ts
import { prisma } from '../server/lib/prisma.js';

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: {
      title: { contains: 'salade', mode: 'insensitive' },
      category: { not: 'Salade' },
    },
  });

  console.log(`Found ${recipes.length} recipe(s) to reclassify as "Salade".`);

  for (const recipe of recipes) {
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { category: 'Salade' },
    });
    console.log(`- ${recipe.id} (${recipe.title}): ${recipe.category} -> Salade`);
  }

  await prisma.$disconnect();
}

main();
