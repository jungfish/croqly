import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/supabaseAuth.js';
import { parseIngredientLine, canonicalizeName } from '../lib/ingredientParsing.js';
import { toBaseUnit, formatLabel } from '../lib/unitConversion.js';
import { isPantryStaple } from '../lib/pantryStaples.js';
import { categorizeIngredient, IngredientCategory } from '../lib/ingredientCategory.js';
import { logError } from '../lib/logger.js';

const router = Router();

interface MergeLine {
  name: string;
  unit: string;
  quantity: number | null;
  category: IngredientCategory;
  recipeId: string;
}

// Free-text ingredient lines -> merge-ready lines: parsed, canonicalized,
// converted to a base unit, and stripped of pantry staples (sel/poivre/eau —
// see server/lib/pantryStaples.ts) that never belong on a shopping list.
function linesFromRecipe(recipeId: string, ingredients: string): MergeLine[] {
  const rawLines: string[] = JSON.parse(ingredients || '[]');
  return rawLines
    .map((raw) => {
      const parsed = parseIngredientLine(raw);
      const name = canonicalizeName(parsed.name);
      if (!name || isPantryStaple(name)) return null;
      const { quantity, unit } = toBaseUnit(parsed.quantity, parsed.unit);
      return { name, unit, quantity, category: categorizeIngredient(name), recipeId };
    })
    .filter((line): line is MergeLine => line !== null);
}

// Sequential (not parallel) on purpose: each line's upsert must see the
// previous one's result within the same transaction, so two lines that
// canonicalize to the same (name, unit) — even from the same recipe — merge
// correctly instead of racing to create duplicate rows.
async function mergeLines(userId: string, lines: MergeLine[]) {
  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const existing = await tx.shoppingListItem.findUnique({
        where: { userId_name_unit: { userId, name: line.name, unit: line.unit } },
      });

      if (existing) {
        const quantity =
          existing.quantity == null && line.quantity == null
            ? null
            : (existing.quantity ?? 0) + (line.quantity ?? 0);
        await tx.shoppingListItem.update({
          where: { id: existing.id },
          data: {
            quantity,
            label: formatLabel(line.name, quantity, line.unit),
            category: line.category,
            sourceRecipeIds: Array.from(new Set([...existing.sourceRecipeIds, line.recipeId])),
          },
        });
      } else {
        await tx.shoppingListItem.create({
          data: {
            userId,
            name: line.name,
            unit: line.unit,
            quantity: line.quantity,
            label: formatLabel(line.name, line.quantity, line.unit),
            category: line.category,
            sourceRecipeIds: [line.recipeId],
          },
        });
      }
    }
  });
}

function fetchList(userId: string) {
  return prisma.shoppingListItem.findMany({
    where: { userId },
    orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }],
  });
}

const getList: RequestHandler = async (req, res) => {
  try {
    res.json(await fetchList(req.user!.id));
  } catch (error) {
    logError('Error fetching shopping list', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
};

const addFromRecipe: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    await mergeLines(req.user!.id, linesFromRecipe(recipe.id, recipe.ingredients));
    res.json(await fetchList(req.user!.id));
  } catch (error) {
    logError('Error adding recipe to shopping list', error);
    res.status(500).json({ error: 'Failed to add recipe to shopping list' });
  }
};

const addFromRecipes: RequestHandler = async (req, res) => {
  try {
    const { recipeIds } = req.body as { recipeIds?: string[] };
    if (!recipeIds?.length) return res.status(400).json({ error: 'recipeIds is required' });

    const recipes = await prisma.recipe.findMany({ where: { id: { in: recipeIds } } });
    const lines = recipes.flatMap((recipe) => linesFromRecipe(recipe.id, recipe.ingredients));
    await mergeLines(req.user!.id, lines);
    res.json(await fetchList(req.user!.id));
  } catch (error) {
    logError('Error adding recipes to shopping list', error);
    res.status(500).json({ error: 'Failed to add recipes to shopping list' });
  }
};

const updateItem: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { checked, quantity, unit } = req.body as { checked?: boolean; quantity?: number | null; unit?: string };
    const data: { checked?: boolean; quantity?: number | null; unit?: string; label?: string } = {};
    if (checked !== undefined) data.checked = checked;
    if (quantity !== undefined) data.quantity = quantity;
    if (unit !== undefined) data.unit = unit;

    if (quantity !== undefined || unit !== undefined) {
      const current = await prisma.shoppingListItem.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!current) return res.status(404).json({ error: 'Item not found' });
      data.label = formatLabel(current.name, quantity ?? current.quantity, unit ?? current.unit);
    }

    const result = await prisma.shoppingListItem.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Item not found' });

    res.json({ updated: true });
  } catch (error) {
    logError('Error updating shopping list item', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

const deleteItem: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const result = await prisma.shoppingListItem.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (error) {
    logError('Error deleting shopping list item', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

const clearChecked: RequestHandler = async (req, res) => {
  try {
    await prisma.shoppingListItem.deleteMany({ where: { userId: req.user!.id, checked: true } });
    res.json({ cleared: true });
  } catch (error) {
    logError('Error clearing checked items', error);
    res.status(500).json({ error: 'Failed to clear checked items' });
  }
};

const clearAll: RequestHandler = async (req, res) => {
  try {
    await prisma.shoppingListItem.deleteMany({ where: { userId: req.user!.id } });
    res.json({ cleared: true });
  } catch (error) {
    logError('Error clearing shopping list', error);
    res.status(500).json({ error: 'Failed to clear shopping list' });
  }
};

router.get('/', requireAuth, getList);
router.post('/from-recipe/:id', requireAuth, addFromRecipe);
router.post('/from-recipes', requireAuth, addFromRecipes);
// Registered before the '/:id' routes below — otherwise "checked" (or no
// segment at all, for the bare DELETE '/') would be captured as an :id param
// and these handlers would never be reached.
router.delete('/checked', requireAuth, clearChecked);
router.delete('/', requireAuth, clearAll);
router.patch('/:id', requireAuth, updateItem);
router.delete('/:id', requireAuth, deleteItem);

export default router;
