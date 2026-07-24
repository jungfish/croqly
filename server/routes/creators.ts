import crypto from 'crypto';
import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { instagramFetcher } from '../lib/instagramFetcher.js';
import { tiktokFetcher } from '../lib/tiktokFetcher.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

type PlatformParam = { platform: string; handle: string };

function parsePlatform(raw: string): 'instagram' | 'tiktok' | null {
  return raw === 'instagram' || raw === 'tiktok' ? raw : null;
}

// Public hub data for /createurs/:platform/:handle — no auth, mirrors the
// shape server/routes/db.ts already returns for a single recipe (parsed
// ingredients/instructions, minimal creator projection).
const getCreatorByHandle: RequestHandler<PlatformParam> = async (req, res) => {
  try {
    const platform = parsePlatform(req.params.platform);
    if (!platform) return res.status(400).json({ error: 'Unknown platform' });

    const creator = await prisma.creator.findUnique({
      where: { platform_handle: { platform, handle: req.params.handle } },
      include: { recipes: { orderBy: { createdAt: 'desc' } } },
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Explicit whitelist rather than a spread — claimVerificationCode and
    // claimRequestedByUserId are pending-claim internals that must never
    // reach this public, unauthenticated endpoint.
    res.json({
      creator: {
        id: creator.id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        avatarUrl: creator.avatarUrl,
        bio: creator.bio,
        claimed: creator.claimed,
      },
      recipes: creator.recipes.map((recipe) => ({
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

// Step 1 of the claim flow: generates a short code the logged-in user must
// post in their Instagram/TikTok bio to prove ownership of the handle.
// Stored as "pending" state, separate from claimed/claimedByUserId, so an
// abandoned request never reads as claimed.
const requestClaim: RequestHandler<PlatformParam> = async (req, res) => {
  try {
    const platform = parsePlatform(req.params.platform);
    if (!platform) return res.status(400).json({ error: 'Unknown platform' });

    const creator = await prisma.creator.findUnique({ where: { platform_handle: { platform, handle: req.params.handle } } });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    if (creator.claimed) {
      return res.status(409).json({ error: 'This creator page is already claimed' });
    }

    const code = `croqly-${crypto.randomBytes(4).toString('hex')}`;
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        claimVerificationCode: code,
        claimRequestedByUserId: req.user!.id,
        claimRequestedAt: new Date(),
      },
    });

    res.json({ code });
  } catch (error) {
    console.error('Error requesting creator claim:', error);
    res.status(500).json({ error: 'Failed to request claim' });
  }
};

// Step 2: re-fetches the live Instagram/TikTok bio and checks the pending
// code is present — if it matches (and the requester is the same user who
// asked for the code), the claim becomes confirmed.
const verifyClaim: RequestHandler<PlatformParam> = async (req, res) => {
  try {
    const platform = parsePlatform(req.params.platform);
    if (!platform) return res.status(400).json({ error: 'Unknown platform' });

    const creator = await prisma.creator.findUnique({ where: { platform_handle: { platform, handle: req.params.handle } } });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    if (!creator.claimVerificationCode || creator.claimRequestedByUserId !== req.user!.id) {
      return res.status(400).json({ error: 'No pending claim request for this user' });
    }

    const fetcher = platform === 'instagram' ? instagramFetcher : tiktokFetcher;
    const profile = await fetcher.getProfileByHandle(creator.handle);
    if (!profile.biography?.includes(creator.claimVerificationCode)) {
      return res.status(400).json({ error: `Verification code not found in the ${platform} bio yet` });
    }

    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        claimed: true,
        claimedByUserId: creator.claimRequestedByUserId,
        claimVerificationCode: null,
        claimRequestedByUserId: null,
        claimRequestedAt: null,
      },
    });

    res.json({ claimed: true });
  } catch (error) {
    console.error('Error verifying creator claim:', error);
    res.status(500).json({ error: 'Failed to verify claim' });
  }
};

router.get('/:platform/:handle', getCreatorByHandle);
router.post('/:platform/:handle/claim/request', requireAuth, requestClaim);
router.post('/:platform/:handle/claim/verify', requireAuth, verifyClaim);

export default router;
