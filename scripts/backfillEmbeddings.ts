// One-off backfill: recipes created before the embedding column (see
// prisma/migrations/20260724102227_add_recipe_embedding) have no embedding.
// Generates one via server/lib/embeddings.ts for each, same as the live
// create paths (server/routes/recipes.ts, server/routes/db.ts).
// Run with: npx tsx scripts/backfillEmbeddings.ts
import { prisma } from '../server/lib/prisma.js';
import { buildEmbeddingInput, embed, storeRecipeEmbedding } from '../server/lib/embeddings.js';

interface RecipeRow {
  id: string;
  title: string;
  category: string;
  ingredients: string;
  instructions: string;
}

async function main() {
  const recipes = await prisma.$queryRaw<RecipeRow[]>`
    SELECT id, title, category, ingredients, instructions
    FROM "Recipe"
    WHERE embedding IS NULL
  `;

  console.log(`Found ${recipes.length} recipe(s) with no embedding to backfill.`);

  for (const recipe of recipes) {
    try {
      const input = buildEmbeddingInput({
        title: recipe.title,
        category: recipe.category,
        ingredients: JSON.parse(recipe.ingredients || '[]'),
        instructions: JSON.parse(recipe.instructions || '[]'),
      });
      await storeRecipeEmbedding(recipe.id, await embed(input));
      console.log(`- ${recipe.id} (${recipe.title}): embedded.`);
    } catch (error) {
      console.error(`- ${recipe.id} (${recipe.title}): failed —`, (error as Error).message);
    }
  }

  await prisma.$disconnect();
}

main();
