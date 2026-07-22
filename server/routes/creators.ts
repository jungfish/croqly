import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Public hub data for /createurs/:handle — no auth, mirrors the shape
// server/routes/db.ts already returns for a single recipe (parsed
// ingredients/instructions, minimal creator projection).
const getCreatorByHandle: RequestHandler<{ handle: string }> = async (req, res) => {
  try {
    const creator = await prisma.creator.findUnique({
      where: { instagramHandle: req.params.handle },
      include: { recipes: { orderBy: { createdAt: 'desc' } } },
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const { recipes, ...creatorFields } = creator;
    res.json({
      creator: creatorFields,
      recipes: recipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients ? JSON.parse(recipe.ingredients) : [],
        instructions: recipe.instructions ? JSON.parse(recipe.instructions) : [],
      })),
    });
  } catch (error) {
    console.error('Error fetching creator:', error);
    res.status(500).json({ error: 'Failed to fetch creator' });
  }
};

router.get('/:handle', getCreatorByHandle);

export default router;
