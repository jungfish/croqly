// One-off: re-run the scrape + AI pipeline for a single existing recipe,
// by id. Unlike POST /api/recipes/from-url (server/routes/recipes.ts), which
// skips reprocessing entirely on a URL cache hit, this always re-fetches the
// source media, re-transcribes, and re-interprets — useful when the original
// scrape produced bad/incomplete data.
// Run with: npx tsx scripts/rescrapeRecipe.ts <recipeId>
import { prisma } from '../server/lib/prisma.js';
import { instagramFetcher } from '../server/lib/instagramFetcher.js';
import { tiktokFetcher } from '../server/lib/tiktokFetcher.js';
import { transcribeVideoFromUrl } from '../server/lib/transcription.js';
import { interpretRecipe } from '../server/lib/aiInterpretation.js';

async function main() {
  const recipeId = process.argv[2];
  if (!recipeId) {
    console.error('Usage: npx tsx scripts/rescrapeRecipe.ts <recipeId>');
    process.exit(1);
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) {
    console.error(`Recipe ${recipeId} not found.`);
    process.exit(1);
  }
  if (!recipe.url || (recipe.platform !== 'instagram' && recipe.platform !== 'tiktok')) {
    console.error(`Recipe ${recipeId} (${recipe.title}) has no supported source URL to re-scrape.`);
    process.exit(1);
  }

  console.log(`Re-scraping ${recipe.id} (${recipe.title}) from ${recipe.url} ...`);

  const fetcher = recipe.platform === 'tiktok' ? tiktokFetcher : instagramFetcher;
  const media = await fetcher.getMediaByUrl(recipe.url);
  const transcription = await transcribeVideoFromUrl(media.videoUrl);
  const interpreted = await interpretRecipe(media.caption, transcription ?? '');

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: {
      title: interpreted.title,
      category: interpreted.category,
      ingredients: JSON.stringify(interpreted.ingredients),
      instructions: JSON.stringify(interpreted.instructions),
      prepTime: interpreted.prepTime,
      cookTime: interpreted.cookTime,
      totalTime: interpreted.totalTime,
      servings: interpreted.servings,
      videoUrl: media.videoUrl,
    },
  });

  console.log(`Done — ${recipe.id} updated: "${interpreted.title}"`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Re-scrape failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
