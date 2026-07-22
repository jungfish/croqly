import crypto from 'crypto';
import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { instagramFetcher } from '../lib/instagramFetcher.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

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

    // Explicit whitelist rather than a spread — claimVerificationCode and
    // claimRequestedByUserId are pending-claim internals that must never
    // reach this public, unauthenticated endpoint.
    res.json({
      creator: {
        id: creator.id,
        instagramHandle: creator.instagramHandle,
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
// post in their Instagram bio to prove ownership of the handle. Stored as
// "pending" state, separate from claimed/claimedByUserId, so an abandoned
// request never reads as claimed.
const requestClaim: RequestHandler<{ handle: string }> = async (req, res) => {
  try {
    const creator = await prisma.creator.findUnique({ where: { instagramHandle: req.params.handle } });
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

// Step 2: re-fetches the live Instagram bio and checks the pending code is
// present — if it matches (and the requester is the same user who asked for
// the code), the claim becomes confirmed.
const verifyClaim: RequestHandler<{ handle: string }> = async (req, res) => {
  try {
    const creator = await prisma.creator.findUnique({ where: { instagramHandle: req.params.handle } });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    if (!creator.claimVerificationCode || creator.claimRequestedByUserId !== req.user!.id) {
      return res.status(400).json({ error: 'No pending claim request for this user' });
    }

    const profile = await instagramFetcher.getProfileByHandle(creator.instagramHandle);
    if (!profile.biography?.includes(creator.claimVerificationCode)) {
      return res.status(400).json({ error: 'Verification code not found in the Instagram bio yet' });
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

router.get('/:handle', getCreatorByHandle);
router.post('/:handle/claim/request', requireAuth, requestClaim);
router.post('/:handle/claim/verify', requireAuth, verifyClaim);

export default router;
