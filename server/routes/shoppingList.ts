import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/supabaseAuth.js';
import { parseIngredientLine, canonicalizeName } from '../lib/ingredientParsing.js';
import { toBaseUnit, formatLabel } from '../lib/unitConversion.js';
import { isPantryStaple } from '../lib/pantryStaples.js';
import { categorizeIngredient, IngredientCategory } from '../lib/ingredientCategory.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { logError } from '../lib/logger.js';

const router = Router();

interface MergeLine {
  name: string;
  unit: string;
  quantity: number | null;
  category: IngredientCategory;
  recipeId?: string;
}

// Free-text ingredient lines -> merge-ready lines: parsed, canonicalized,
// converted to a base unit, and stripped of pantry staples (sel/poivre/eau —
// see server/lib/pantryStaples.ts) that never belong on a shopping list.
function linesFromRecipe(recipeId: string, ingredients: string): MergeLine[] {
  const rawLines: string[] = JSON.parse(ingredients || '[]');
  return rawLines
    .map((raw): MergeLine | null => {
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
            sourceRecipeIds: line.recipeId
              ? Array.from(new Set([...existing.sourceRecipeIds, line.recipeId]))
              : existing.sourceRecipeIds,
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
            sourceRecipeIds: line.recipeId ? [line.recipeId] : [],
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

// A list is normally the caller's own, unless someone in their bande has
// shared their list with the caller — in that case every read/write below
// redirects to the sharer's items instead, so the two of them work off a
// single shared list (see ShoppingListShare in schema.prisma).
async function resolveListOwnerId(userId: string): Promise<string> {
  const incoming = await prisma.shoppingListShare.findFirst({ where: { sharedWithUserId: userId } });
  return incoming?.ownerUserId ?? userId;
}

async function resolveEmail(userId: string): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

const getList: RequestHandler = async (req, res) => {
  try {
    const ownerId = await resolveListOwnerId(req.user!.id);
    res.json(await fetchList(ownerId));
  } catch (error) {
    logError('Error fetching shopping list', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
};

const addFromRecipe: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const ownerId = await resolveListOwnerId(req.user!.id);
    await mergeLines(ownerId, linesFromRecipe(recipe.id, recipe.ingredients));
    res.json(await fetchList(ownerId));
  } catch (error) {
    logError('Error adding recipe to shopping list', error);
    res.status(500).json({ error: 'Failed to add recipe to shopping list' });
  }
};

const addManualItem: RequestHandler = async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const parsed = parseIngredientLine(text);
    const name = canonicalizeName(parsed.name);
    if (!name) return res.status(400).json({ error: 'text is required' });

    const { quantity, unit } = toBaseUnit(parsed.quantity, parsed.unit);
    const ownerId = await resolveListOwnerId(req.user!.id);
    await mergeLines(ownerId, [{ name, unit, quantity, category: categorizeIngredient(name) }]);
    res.json(await fetchList(ownerId));
  } catch (error) {
    logError('Error adding manual shopping list item', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

const addFromRecipes: RequestHandler = async (req, res) => {
  try {
    const { recipeIds } = req.body as { recipeIds?: string[] };
    if (!recipeIds?.length) return res.status(400).json({ error: 'recipeIds is required' });

    const recipes = await prisma.recipe.findMany({ where: { id: { in: recipeIds } } });
    const lines = recipes.flatMap((recipe) => linesFromRecipe(recipe.id, recipe.ingredients));
    const ownerId = await resolveListOwnerId(req.user!.id);
    await mergeLines(ownerId, lines);
    res.json(await fetchList(ownerId));
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

    const ownerId = await resolveListOwnerId(req.user!.id);

    if (quantity !== undefined || unit !== undefined) {
      const current = await prisma.shoppingListItem.findFirst({
        where: { id: req.params.id, userId: ownerId },
      });
      if (!current) return res.status(404).json({ error: 'Item not found' });
      data.label = formatLabel(current.name, quantity ?? current.quantity, unit ?? current.unit);
    }

    const result = await prisma.shoppingListItem.updateMany({
      where: { id: req.params.id, userId: ownerId },
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
    const ownerId = await resolveListOwnerId(req.user!.id);
    const result = await prisma.shoppingListItem.deleteMany({ where: { id: req.params.id, userId: ownerId } });
    if (result.count === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (error) {
    logError('Error deleting shopping list item', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

const clearChecked: RequestHandler = async (req, res) => {
  try {
    const ownerId = await resolveListOwnerId(req.user!.id);
    await prisma.shoppingListItem.deleteMany({ where: { userId: ownerId, checked: true } });
    res.json({ cleared: true });
  } catch (error) {
    logError('Error clearing checked items', error);
    res.status(500).json({ error: 'Failed to clear checked items' });
  }
};

const clearAll: RequestHandler = async (req, res) => {
  try {
    const ownerId = await resolveListOwnerId(req.user!.id);
    await prisma.shoppingListItem.deleteMany({ where: { userId: ownerId } });
    res.json({ cleared: true });
  } catch (error) {
    logError('Error clearing shopping list', error);
    res.status(500).json({ error: 'Failed to clear shopping list' });
  }
};

// Current sharing state: who the caller shares their own list with
// (`sharedWith`), and whose list the caller is currently working off of
// instead of their own (`viewingSharedFrom`) — both null by default.
const getShareStatus: RequestHandler = async (req, res) => {
  try {
    const userId = req.user!.id;
    const [outgoing, incoming] = await Promise.all([
      prisma.shoppingListShare.findUnique({ where: { ownerUserId: userId } }),
      prisma.shoppingListShare.findFirst({ where: { sharedWithUserId: userId } }),
    ]);

    const [sharedWithEmail, viewingSharedFromEmail] = await Promise.all([
      outgoing ? resolveEmail(outgoing.sharedWithUserId) : Promise.resolve(null),
      incoming ? resolveEmail(incoming.ownerUserId) : Promise.resolve(null),
    ]);

    res.json({
      sharedWith: outgoing ? { userId: outgoing.sharedWithUserId, email: sharedWithEmail } : null,
      viewingSharedFrom: incoming ? { userId: incoming.ownerUserId, email: viewingSharedFromEmail } : null,
    });
  } catch (error) {
    logError('Error fetching shopping list share status', error);
    res.status(500).json({ error: 'Failed to fetch share status' });
  }
};

// Shares the caller's own list with one bande co-member — replaces any
// previous share (a list can only be shared with one person at a time).
const setShare: RequestHandler = async (req, res) => {
  try {
    const { userId: targetUserId } = req.body as { userId?: string };
    if (!targetUserId) return res.status(400).json({ error: 'userId is required' });
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Impossible de partager ta liste avec toi-même.' });
    }

    const [myMembership, targetMembership] = await Promise.all([
      prisma.householdMember.findUnique({ where: { userId: req.user!.id } }),
      prisma.householdMember.findUnique({ where: { userId: targetUserId } }),
    ]);
    if (!myMembership || !targetMembership || myMembership.householdId !== targetMembership.householdId) {
      return res.status(403).json({ error: 'Cette personne ne fait pas partie de ta bande.' });
    }

    await prisma.shoppingListShare.upsert({
      where: { ownerUserId: req.user!.id },
      update: { sharedWithUserId: targetUserId },
      create: { ownerUserId: req.user!.id, sharedWithUserId: targetUserId },
    });
    res.json({ shared: true });
  } catch (error) {
    logError('Error sharing shopping list', error);
    res.status(500).json({ error: 'Failed to share shopping list' });
  }
};

const unsetShare: RequestHandler = async (req, res) => {
  try {
    await prisma.shoppingListShare.deleteMany({ where: { ownerUserId: req.user!.id } });
    res.json({ shared: false });
  } catch (error) {
    logError('Error unsharing shopping list', error);
    res.status(500).json({ error: 'Failed to unshare shopping list' });
  }
};

router.get('/', requireAuth, getList);
router.post('/', requireAuth, addManualItem);
router.post('/from-recipe/:id', requireAuth, addFromRecipe);
router.post('/from-recipes', requireAuth, addFromRecipes);
// Registered before the '/:id' routes below — otherwise "checked"/"share"
// (or no segment at all, for the bare DELETE '/') would be captured as an
// :id param and these handlers would never be reached.
router.get('/share', requireAuth, getShareStatus);
router.post('/share', requireAuth, setShare);
router.delete('/share', requireAuth, unsetShare);
router.delete('/checked', requireAuth, clearChecked);
router.delete('/', requireAuth, clearAll);
router.patch('/:id', requireAuth, updateItem);
router.delete('/:id', requireAuth, deleteItem);

export default router;
