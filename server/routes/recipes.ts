import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { normalizeInstagramUrl } from '../lib/normalizeInstagramUrl.js';
import { normalizeTiktokUrl } from '../lib/normalizeTiktokUrl.js';
import { instagramFetcher } from '../lib/instagramFetcher.js';
import { tiktokFetcher } from '../lib/tiktokFetcher.js';
import { transcribeVideoFromUrl } from '../lib/transcription.js';
import { interpretRecipe, generateIllustration } from '../lib/aiInterpretation.js';
import { isAnonymousLimitExceeded, recordAnonymousUsage } from '../lib/rateLimit.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

type CreatorRef = { platform: 'instagram' | 'tiktok'; handle: string; displayName: string | null; avatarUrl: string | null } | null;

function parseRecipe<T extends { ingredients: string; instructions: string; creator?: CreatorRef }>(recipe: T) {
  const { creator, ...rest } = recipe;
  return {
    ...rest,
    ingredients: JSON.parse(recipe.ingredients || '[]'),
    instructions: JSON.parse(recipe.instructions || '[]'),
    creator: creator
      ? { platform: creator.platform, handle: creator.handle, displayName: creator.displayName, avatarUrl: creator.avatarUrl }
      : null,
  };
}

// Routes a raw URL to the right normalizer by hostname. Instagram and TikTok
// are the only supported sources for now.
function normalizeSourceUrl(rawUrl: string): { normalizedUrl: string; platform: 'instagram' | 'tiktok' } {
  const host = new URL(rawUrl).hostname.replace(/^www\./, '');
  if (host === 'instagram.com') return { normalizedUrl: normalizeInstagramUrl(rawUrl), platform: 'instagram' };
  if (host.endsWith('tiktok.com')) return { normalizedUrl: normalizeTiktokUrl(rawUrl), platform: 'tiktok' };
  throw new Error('Lien non supporté — colle un lien Instagram ou TikTok.');
}

// The cache gate: a URL that's already been processed by anyone skips the
// scrape + AI pipeline entirely (step 5). Rate limiting only applies to the
// expensive branch (a cache miss) for anonymous callers.
//
// Illustration generation (10-30s, the single slowest step after the Apify
// scrape) is deliberately NOT awaited here — nothing downstream depends on
// its output, and chaining it onto this request risked tipping the whole
// pipeline over the serverless function's time limit. The recipe is created
// with the Instagram thumbnail as a placeholder; the client requests the
// real illustration afterwards via POST /:id/illustration (see below).
const fromUrl: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: 'url is required' });

    let normalizedUrl: string;
    let platform: 'instagram' | 'tiktok';
    try {
      ({ normalizedUrl, platform } = normalizeSourceUrl(url));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid URL' });
    }

    let recipe = await prisma.recipe.findUnique({ where: { url: normalizedUrl }, include: { creator: true } });
    const cached = Boolean(recipe);

    if (!recipe) {
      if (!req.user && (await isAnonymousLimitExceeded(req.ip ?? 'unknown'))) {
        return res.status(429).json({
          error: 'Daily limit reached for new imports — sign up for unlimited access.',
        });
      }

      const media = platform === 'tiktok'
        ? await tiktokFetcher.getMediaByUrl(normalizedUrl)
        : await instagramFetcher.getMediaByUrl(normalizedUrl);
      const transcription = await transcribeVideoFromUrl(media.videoUrl);
      const interpreted = await interpretRecipe(media.caption, transcription ?? '');

      const creator = media.ownerUsername
        ? await prisma.creator.upsert({
            where: { platform_handle: { platform, handle: media.ownerUsername } },
            create: {
              platform,
              handle: media.ownerUsername,
              displayName: media.ownerFullName,
              avatarUrl: media.ownerProfilePicUrl,
            },
            // Keep the cached profile info fresh on every new recipe pulled
            // from this account, without touching claimed/claimedByUserId.
            update: {
              displayName: media.ownerFullName,
              avatarUrl: media.ownerProfilePicUrl,
            },
          })
        : null;

      recipe = await prisma.recipe.create({
        data: {
          title: interpreted.title,
          category: interpreted.category,
          ingredients: JSON.stringify(interpreted.ingredients),
          instructions: JSON.stringify(interpreted.instructions),
          // Raw source thumbnail as a placeholder — not resized/converted,
          // since it's replaced by the generated WebP variants within seconds.
          illustration: media.thumbnailUrl ?? null,
          illustrationThumb: media.thumbnailUrl ?? null,
          illustrationPending: true,
          platform,
          url: normalizedUrl,
          videoUrl: media.videoUrl,
          prepTime: interpreted.prepTime,
          cookTime: interpreted.cookTime,
          totalTime: interpreted.totalTime,
          servings: interpreted.servings,
          creatorId: creator?.id,
        },
        include: { creator: true },
      });

      if (!req.user) await recordAnonymousUsage(req.ip ?? 'unknown');
    }

    if (req.user) {
      await prisma.savedRecipe.upsert({
        where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
        create: { userId: req.user.id, recipeId: recipe.id },
        update: {},
      });
    }

    res.json({ ...parseRecipe(recipe), cached });
  } catch (error) {
    console.error('Error processing recipe from URL:', error);
    res.status(500).json({ error: 'Failed to process recipe' });
  }
};

// Generates the AI illustration for a recipe and persists it. Called by the
// client right after a fresh (non-cached) recipe is created, out of band
// from the from-url request — see the comment above fromUrl.
const generateRecipeIllustration: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const { full, thumb } = await generateIllustration(recipe.title, JSON.parse(recipe.ingredients || '[]'));
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { illustration: full, illustrationThumb: thumb, illustrationPending: false },
    });

    res.json({ illustration: full, illustrationThumb: thumb });
  } catch (error) {
    console.error('Error generating recipe illustration:', error);
    res.status(500).json({ error: 'Failed to generate illustration' });
  }
};

// "Mes recettes" — the per-user saved list, joined through SavedRecipe.
const getMine: RequestHandler = async (req, res) => {
  try {
    const saved = await prisma.savedRecipe.findMany({
      where: { userId: req.user!.id },
      include: { recipe: true },
      orderBy: { savedAt: 'desc' },
    });
    res.json(saved.map((s) => parseRecipe(s.recipe)));
  } catch (error) {
    console.error('Error fetching saved recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// Explicit "Save" action on an already-viewed recipe (e.g. from the recipe
// detail page) — same upsert used by the URL flow, exposed standalone so the
// pending-save-through-signup flow (step 7) can call it after auth succeeds.
const saveExisting: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    await prisma.savedRecipe.upsert({
      where: { userId_recipeId: { userId: req.user!.id, recipeId: recipe.id } },
      create: { userId: req.user!.id, recipeId: recipe.id },
      update: {},
    });
    res.json({ saved: true });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
};

router.post('/from-url', fromUrl);
router.get('/mine', requireAuth, getMine);
router.post('/:id/save', requireAuth, saveExisting);
router.post('/:id/illustration', generateRecipeIllustration);

export default router;
