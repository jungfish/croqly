import { getOpenAI } from './openaiClient.js';
import { prisma } from './prisma.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';

export function buildEmbeddingInput(recipe: {
  title: string;
  category: string;
  ingredients: string[];
  instructions: string[];
}): string {
  return [recipe.title, recipe.category, ...recipe.ingredients, ...recipe.instructions].join('\n');
}

export async function embed(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return response.data[0].embedding;
}

// Prisma can't type the `vector` column (Unsupported("vector(1536)")), so it
// never goes through the normal client — always raw SQL, cast from the
// pgvector text literal format `[0.1,0.2,...]`.
export async function storeRecipeEmbedding(recipeId: string, embedding: number[]): Promise<void> {
  const vectorLiteral = `[${embedding.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Recipe" SET embedding = ${vectorLiteral}::vector WHERE id = ${recipeId}`;
}
