import { Prisma } from '@prisma/client';

// Shared by GET /api/db and GET /api/recipes/mine — keyword search runs
// against title and the raw ingredients JSON string (still a plain substring
// match, no unnesting needed), category is an exact match against the fixed
// enum used throughout the app.
export function buildRecipeSearchWhere(params: { search?: string; category?: string }): Prisma.RecipeWhereInput {
  const where: Prisma.RecipeWhereInput = {};
  if (params.category) where.category = params.category;
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { ingredients: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  return where;
}
