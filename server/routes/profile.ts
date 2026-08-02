import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/supabaseAuth.js';
import { createRandomProfileForUser, VALID_AVATAR_KEYS } from '../lib/randomProfile.js';
import { logError } from '../lib/logger.js';

const router = Router();

const PSEUDO_MIN = 2;
const PSEUDO_MAX = 24;
const PSEUDO_PATTERN = /^[a-zA-Z0-9À-ÿ _.'-]+$/;

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

// Self-heals any authenticated account that still has no profile — not just
// accounts backfilled by scripts/backfillProfiles.ts, but also e.g. a Google
// OAuth signup, which never goes through the Signup.tsx step-2 picker.
// Assigns a random pseudo/avatar, same as the backfill script; the caller
// can still pick their own via PUT afterwards.
const getMyProfile: RequestHandler = async (req, res) => {
  try {
    let profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) profile = await createRandomProfileForUser(req.user!.id);
    res.json({ profile: { pseudo: profile.pseudo, avatarKey: profile.avatarKey } });
  } catch (error) {
    logError('Error fetching profile', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const upsertMyProfile: RequestHandler = async (req, res) => {
  try {
    const { pseudo, avatarKey } = req.body as { pseudo?: string; avatarKey?: string };
    const trimmed = pseudo?.trim();
    if (!trimmed || trimmed.length < PSEUDO_MIN || trimmed.length > PSEUDO_MAX || !PSEUDO_PATTERN.test(trimmed)) {
      return res.status(400).json({ error: `Le pseudo doit faire entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères.` });
    }
    if (!avatarKey || !(VALID_AVATAR_KEYS as readonly string[]).includes(avatarKey)) {
      return res.status(400).json({ error: 'Avatar invalide.' });
    }

    const profile = await prisma.profile.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, pseudo: trimmed, avatarKey },
      update: { pseudo: trimmed, avatarKey },
    });
    res.json({ profile: { pseudo: profile.pseudo, avatarKey: profile.avatarKey } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });
    }
    logError('Error updating profile', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

router.get('/me', requireAuth, getMyProfile);
router.put('/me', requireAuth, upsertMyProfile);

export default router;
