import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildEmbeddingInput, embed, storeRecipeEmbedding } from '../lib/embeddings.js';
import { buildRecipeSearchWhere } from '../lib/recipeSearch.js';
import { logError } from '../lib/logger.js';

const router = Router();

// Get all recipes — optionally narrowed by ?search= and/or ?category=
// (see server/lib/recipeSearch.ts), backing /decouvrir's search box and
// category tabs server-side instead of the old full-fetch-then-filter.
const getAllRecipes: RequestHandler = async (req, res) => {
  try {
    const { search, category } = req.query as { search?: string; category?: string };
    const recipes = await prisma.recipe.findMany({
      where: buildRecipeSearchWhere({ search, category }),
      orderBy: { createdAt: 'desc' },
      include: { creator: true },
    });
    const cleanRecipes = recipes.map(({ creator, ...rest }) => ({
      ...rest,
      creator: creator
        ? { platform: creator.platform, handle: creator.handle, displayName: creator.displayName, avatarUrl: creator.avatarUrl }
        : null,
    }));
    res.json(cleanRecipes);
  } catch (error) {
    logError('Database error', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// Get single recipe by ID
const getRecipeById: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Only meaningful for an authenticated caller — lets the client show an
    // accurate "already saved" state instead of always defaulting to false.
    const savedByMe = req.user
      ? Boolean(
          await prisma.savedRecipe.findUnique({
            where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
          })
        )
      : false;

    // Parse JSON strings
    const { creator, ...rest } = recipe;
    const cleanRecipe = {
      ...rest,
      savedByMe,
      ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
      instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
      creator: creator
        ? { platform: creator.platform, handle: creator.handle, displayName: creator.displayName, avatarUrl: creator.avatarUrl }
        : null,
    };

    res.json(cleanRecipe);
  } catch (error) {
    logError('Error fetching recipe', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
};

// Create or update recipe
const createOrUpdateRecipe: RequestHandler = async (req, res) => {
  try {
    const recipe = req.body;
    
    // Validate required fields
    if (!recipe.title || !recipe.category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and category are required' 
      });
    }

    // Check if recipe with same URL exists
    let existingRecipe = null;
    if (recipe.url) {
      existingRecipe = await prisma.recipe.findFirst({
        where: { url: recipe.url }
      });
    }

    const recipeData = {
      title: recipe.title,
      category: recipe.category,
      ingredients: recipe.ingredients ? JSON.stringify(recipe.ingredients) : '[]',
      instructions: recipe.instructions ? JSON.stringify(recipe.instructions) : '[]',
      illustration: recipe.illustration,
      url: recipe.url,
      videoUrl: recipe.videoUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings
    };

    let savedRecipe;
    if (existingRecipe) {
      savedRecipe = await prisma.recipe.update({
        where: { id: existingRecipe.id },
        data: recipeData,
      });
    } else {
      savedRecipe = await prisma.recipe.create({
        data: recipeData,
      });
    }

    // Best-effort — a failed embed shouldn't fail the save. Any recipe left
    // without one is picked up later by scripts/backfillEmbeddings.ts.
    try {
      const input = buildEmbeddingInput({
        title: recipeData.title,
        category: recipeData.category,
        ingredients: recipe.ingredients ?? [],
        instructions: recipe.instructions ?? [],
      });
      await storeRecipeEmbedding(savedRecipe.id, await embed(input));
    } catch (error) {
      logError('Error embedding recipe', error);
    }

    res.json(savedRecipe);
  } catch (error) {
    logError('Error saving recipe', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
};

// Update recipe
router.put('/:id', async (req, res) => {
  try {
    const updatedRecipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updatedRecipe);
  } catch (error) {
    logError('Error updating recipe', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

router.get('/', getAllRecipes);
router.get('/:id', getRecipeById);
router.post('/', createOrUpdateRecipe);

export default router; 