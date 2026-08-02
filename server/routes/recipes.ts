import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { normalizeInstagramUrl } from '../lib/normalizeInstagramUrl.js';
import { normalizeTiktokUrl } from '../lib/normalizeTiktokUrl.js';
import { instagramFetcher } from '../lib/instagramFetcher.js';
import { tiktokFetcher } from '../lib/tiktokFetcher.js';
import { transcribeVideoFromUrl } from '../lib/transcription.js';
import { interpretRecipe, generateIllustration } from '../lib/aiInterpretation.js';
import { buildEmbeddingInput, embed, storeRecipeEmbedding } from '../lib/embeddings.js';
import { buildRecipeSearchWhere } from '../lib/recipeSearch.js';
import { isAnonymousLimitExceeded, recordAnonymousUsage } from '../lib/rateLimit.js';
import { sendPushToUsers } from '../lib/webPush.js';
import { logError } from '../lib/logger.js';
import { requireAuth } from '../middleware/supabaseAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

// Slack-style curated set for reactions on a bande's shared recipes — kept
// small and food-themed rather than a full emoji picker. Validated
// server-side (see toggleReaction) so a client can't store arbitrary text.
const ALLOWED_REACTION_EMOJIS = ['😋', '🤤', '😍', '👍', '🔥', '❤️'];

type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };

function summarizeReactions(reactions: { emoji: string; userId: string }[], currentUserId: string | undefined): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const reaction of reactions) {
    const existing = byEmoji.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.reactedByMe ||= reaction.userId === currentUserId;
    } else {
      byEmoji.set(reaction.emoji, { emoji: reaction.emoji, count: 1, reactedByMe: reaction.userId === currentUserId });
    }
  }
  // Stable order matching the picker, not insertion order, so the pill row
  // doesn't reshuffle every time someone in the bande reacts.
  return ALLOWED_REACTION_EMOJIS.map((emoji) => byEmoji.get(emoji)).filter((r): r is ReactionSummary => Boolean(r));
}

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
      const transcription = await transcribeVideoFromUrl(media.videoUrl, req.user?.id);
      const interpreted = await interpretRecipe(media.caption, transcription ?? '', req.user?.id);

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
          createdByUserId: req.user?.id,
        },
        include: { creator: true },
      });

      // Best-effort — a failed embed shouldn't fail recipe creation. Any
      // recipe left without one is picked up later by scripts/backfillEmbeddings.ts.
      try {
        const input = buildEmbeddingInput({
          title: interpreted.title,
          category: interpreted.category,
          ingredients: interpreted.ingredients,
          instructions: interpreted.instructions,
        });
        await storeRecipeEmbedding(recipe.id, await embed(input, 'recipe_embedding', req.user?.id));
      } catch (error) {
        logError('Error embedding recipe', error);
      }

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
    logError('Error processing recipe from URL', error);
    res.status(500).json({ error: 'Failed to process recipe' });
  }
};

// Generates the AI illustration for a recipe and persists it. Called by the
// client right after a fresh (non-cached) recipe is created, out of band
// from the from-url request — see the comment above fromUrl.
//
// Nothing stops a client (or an abusive caller) from hitting this endpoint
// repeatedly for the same recipe, and it's unauthenticated — so it doubles
// as the only cost guard on the gpt-image-2 call. `illustrationPending` is
// used as an atomic claim: the conditional update only succeeds for the
// caller that flips true -> false, so concurrent/duplicate calls fall
// through to the cached result instead of each triggering their own
// generation.
const generateRecipeIllustration: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const { count } = await prisma.recipe.updateMany({
      where: { id: recipe.id, illustrationPending: true },
      data: { illustrationPending: false },
    });
    if (count === 0) {
      return res.json({ illustration: recipe.illustration, illustrationThumb: recipe.illustrationThumb });
    }

    try {
      const { full, thumb } = await generateIllustration(recipe.title, JSON.parse(recipe.ingredients || '[]'), req.user?.id);
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { illustration: full, illustrationThumb: thumb },
      });
      res.json({ illustration: full, illustrationThumb: thumb });
    } catch (error) {
      // Generation failed after we claimed the job — release the claim so a
      // later retry isn't silently skipped as "already done".
      await prisma.recipe.update({ where: { id: recipe.id }, data: { illustrationPending: true } });
      throw error;
    }
  } catch (error) {
    logError('Error generating recipe illustration', error);
    res.status(500).json({ error: 'Failed to generate illustration' });
  }
};

// "Mes recettes" — the per-user saved list, joined through SavedRecipe.
// Same ?search=/?category= narrowing as GET /api/db (server/lib/recipeSearch.ts).
const getMine: RequestHandler = async (req, res) => {
  try {
    const { search, category } = req.query as { search?: string; category?: string };
    const saved = await prisma.savedRecipe.findMany({
      where: { userId: req.user!.id, recipe: buildRecipeSearchWhere({ search, category }) },
      include: { recipe: { include: { creator: true } } },
      orderBy: { savedAt: 'desc' },
    });
    res.json(saved.map((s) => parseRecipe(s.recipe)));
  } catch (error) {
    logError('Error fetching saved recipes', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

// "Bande" (user-facing name for a household) — recipes saved by any member
// of one specific bande the caller belongs to (a user can be in several),
// joined through HouseholdMember -> SavedRecipe. Same shape as getMine but
// widens the userId filter from "just me" to "everyone in this bande", and
// attributes each card to whoever saved it (email resolved from Supabase
// auth, same pattern as server/routes/admin.ts). Reactions are scoped to
// this bande too — see toggleReaction.
const getHousehold: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const membership = await prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId: req.params.id, userId: req.user!.id } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const members = await prisma.householdMember.findMany({ where: { householdId: req.params.id } });
    const memberIds = members.map((m) => m.userId);

    const { search, category } = req.query as { search?: string; category?: string };
    const saved = await prisma.savedRecipe.findMany({
      where: { userId: { in: memberIds }, recipe: buildRecipeSearchWhere({ search, category }) },
      include: {
        recipe: { include: { creator: true } },
        reactions: { where: { householdId: req.params.id } },
      },
      orderBy: { savedAt: 'desc' },
    });

    const emailById = new Map<string, string>();
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      await Promise.all(
        memberIds.map(async (id) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id);
          if (data?.user?.email) emailById.set(id, data.user.email);
        })
      );
    }

    res.json(
      saved.map((s) => ({
        ...parseRecipe(s.recipe),
        savedRecipeId: s.id,
        savedByUserId: s.userId,
        savedByEmail: emailById.get(s.userId) ?? null,
        savedByMe: s.userId === req.user!.id,
        savedAt: s.savedAt,
        reactions: summarizeReactions(s.reactions, req.user!.id),
      }))
    );
  } catch (error) {
    logError('Error fetching household recipes', error);
    res.status(500).json({ error: 'Failed to fetch household recipes' });
  }
};

// Toggles the caller's reaction (add if absent, remove if already set) on a
// specific SavedRecipe card, scoped to one bande — a reaction always belongs
// to whichever bande's feed it was made from (see Reaction.householdId),
// since the same saved recipe can appear in more than one of the caller's
// bandes. Gated to members of that bande (reactor and the card's saver both
// need to belong to it) — SavedRecipe ids aren't otherwise access-controlled,
// so this is the only check keeping reactions scoped to people who can
// actually see this card in that bande's feed.
const toggleReaction: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const { emoji, householdId } = req.body as { emoji?: string; householdId?: string };
    if (!emoji || !ALLOWED_REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }
    if (!householdId) return res.status(400).json({ error: 'householdId is required' });

    const savedRecipe = await prisma.savedRecipe.findUnique({
      where: { id: req.params.id },
      include: { recipe: { select: { title: true } } },
    });
    if (!savedRecipe) return res.status(404).json({ error: 'Recipe not found' });

    const [reactorMembership, ownerMembership] = await Promise.all([
      prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId: req.user!.id } } }),
      prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId: savedRecipe.userId } } }),
    ]);
    if (!reactorMembership || !ownerMembership) {
      return res.status(403).json({ error: 'Not allowed to react to this recipe' });
    }

    const existing = await prisma.reaction.findUnique({
      where: { savedRecipeId_householdId_userId_emoji: { savedRecipeId: savedRecipe.id, householdId, userId: req.user!.id, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({ data: { savedRecipeId: savedRecipe.id, householdId, userId: req.user!.id, emoji } });

      // Only on add, not on remove — nobody needs a push about a reaction
      // being taken back.
      const members = await prisma.householdMember.findMany({ where: { householdId } });
      sendPushToUsers(
        members.map((m) => m.userId),
        {
          title: 'Nouvelle réaction',
          body: `${req.user!.email ?? 'Quelqu’un'} a réagi ${emoji} à « ${savedRecipe.recipe.title} »`,
          url: '/bande',
        },
        req.user!.id
      ).catch((error) => logError('Error sending reaction push notification', error));
    }

    const reactions = await prisma.reaction.findMany({ where: { savedRecipeId: savedRecipe.id, householdId } });
    res.json({ reactions: summarizeReactions(reactions, req.user!.id) });
  } catch (error) {
    logError('Error toggling reaction', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
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
    logError('Error saving recipe', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
};

// Removes the recipe from the caller's own "Mes recettes" — only deletes
// their SavedRecipe row (and, via cascade, their Reactions on it), never the
// underlying Recipe: it's a platform-wide cache that other users may have
// saved too. deleteMany (not delete) so a repeat/stale call is a no-op
// instead of a 404.
const deleteSavedRecipe: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    await prisma.savedRecipe.deleteMany({ where: { recipeId: req.params.id, userId: req.user!.id } });
    res.json({ deleted: true });
  } catch (error) {
    logError('Error deleting saved recipe', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
};

router.post('/from-url', fromUrl);
router.get('/mine', requireAuth, getMine);
router.get('/household/:id', requireAuth, getHousehold);
router.post('/saved/:id/reactions', requireAuth, toggleReaction);
router.post('/:id/save', requireAuth, saveExisting);
router.delete('/:id/save', requireAuth, deleteSavedRecipe);
router.post('/:id/illustration', generateRecipeIllustration);

export default router;
