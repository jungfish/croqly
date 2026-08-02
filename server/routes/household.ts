import crypto from 'crypto';
import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { logError } from '../lib/logger.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

// Excludes visually ambiguous characters (0/O, 1/I) since this code is meant
// to be read aloud or typed in by another household member.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length = 6): string {
  return Array.from({ length }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

async function resolveEmails(userIds: string[]): Promise<Map<string, string>> {
  const emailById = new Map<string, string>();
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return emailById;
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data?.user?.email) emailById.set(id, data.user.email);
    })
  );
  return emailById;
}

// Current user's household, if any, with member emails resolved from
// Supabase auth (same pattern as server/routes/admin.ts) since there's no
// local Users table to join against.
const getMyHousehold: RequestHandler = async (req, res) => {
  try {
    const membership = await prisma.householdMember.findUnique({
      where: { userId: req.user!.id },
      include: { household: { include: { members: true } } },
    });
    if (!membership) return res.json({ household: null });

    const memberIds = membership.household.members.map((m) => m.userId);
    const emailById = await resolveEmails(memberIds);

    res.json({
      household: {
        id: membership.household.id,
        name: membership.household.name,
        inviteCode: membership.household.inviteCode,
        members: membership.household.members
          .map((m) => ({
            userId: m.userId,
            email: emailById.get(m.userId) ?? null,
            joinedAt: m.joinedAt,
            isMe: m.userId === req.user!.id,
          }))
          .sort((a, b) => (a.joinedAt < b.joinedAt ? -1 : 1)),
      },
    });
  } catch (error) {
    logError('Error fetching household', error);
    res.status(500).json({ error: 'Failed to fetch household' });
  }
};

// A user belongs to at most one household — retried a few times on the rare
// invite-code collision (see HouseholdMember.userId unique constraint).
const createHousehold: RequestHandler = async (req, res) => {
  try {
    const existing = await prisma.householdMember.findUnique({ where: { userId: req.user!.id } });
    if (existing) return res.status(409).json({ error: 'Tu fais déjà partie d’un foyer.' });

    const { name } = req.body as { name?: string };

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const household = await prisma.household.create({
          data: {
            name: name?.trim() || null,
            inviteCode: generateInviteCode(),
            members: { create: { userId: req.user!.id } },
          },
        });
        return res.status(201).json({
          household: {
            id: household.id,
            name: household.name,
            inviteCode: household.inviteCode,
            members: [{ userId: req.user!.id, email: req.user!.email ?? null, joinedAt: household.createdAt, isMe: true }],
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
        throw error;
      }
    }
    res.status(500).json({ error: 'Failed to create household' });
  } catch (error) {
    logError('Error creating household', error);
    res.status(500).json({ error: 'Failed to create household' });
  }
};

const joinHousehold: RequestHandler = async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return res.status(400).json({ error: 'code is required' });

    const existing = await prisma.householdMember.findUnique({ where: { userId: req.user!.id } });
    if (existing) {
      return res.status(409).json({ error: 'Tu fais déjà partie d’un foyer — quitte-le avant d’en rejoindre un autre.' });
    }

    const household = await prisma.household.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
    if (!household) return res.status(404).json({ error: 'Code invalide.' });

    await prisma.householdMember.create({ data: { householdId: household.id, userId: req.user!.id } });
    res.json({ joined: true });
  } catch (error) {
    logError('Error joining household', error);
    res.status(500).json({ error: 'Failed to join household' });
  }
};

// Deletes the household once its last member leaves, so an abandoned
// household never lingers with a still-valid invite code.
const leaveHousehold: RequestHandler = async (req, res) => {
  try {
    const membership = await prisma.householdMember.findUnique({ where: { userId: req.user!.id } });
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucun foyer.' });

    await prisma.householdMember.delete({ where: { userId: req.user!.id } });
    const remaining = await prisma.householdMember.count({ where: { householdId: membership.householdId } });
    if (remaining === 0) await prisma.household.delete({ where: { id: membership.householdId } });

    res.json({ left: true });
  } catch (error) {
    logError('Error leaving household', error);
    res.status(500).json({ error: 'Failed to leave household' });
  }
};

const renameHousehold: RequestHandler = async (req, res) => {
  try {
    const membership = await prisma.householdMember.findUnique({ where: { userId: req.user!.id } });
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucun foyer.' });

    const { name } = req.body as { name?: string };
    const household = await prisma.household.update({
      where: { id: membership.householdId },
      data: { name: name?.trim() || null },
    });
    res.json({ name: household.name });
  } catch (error) {
    logError('Error renaming household', error);
    res.status(500).json({ error: 'Failed to rename household' });
  }
};

// Invalidates the old code (e.g. after sharing it too broadly) without
// affecting existing members.
const regenerateCode: RequestHandler = async (req, res) => {
  try {
    const membership = await prisma.householdMember.findUnique({ where: { userId: req.user!.id } });
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucun foyer.' });

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const household = await prisma.household.update({
          where: { id: membership.householdId },
          data: { inviteCode: generateInviteCode() },
        });
        return res.json({ inviteCode: household.inviteCode });
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
        throw error;
      }
    }
    res.status(500).json({ error: 'Failed to regenerate code' });
  } catch (error) {
    logError('Error regenerating household invite code', error);
    res.status(500).json({ error: 'Failed to regenerate code' });
  }
};

router.get('/me', requireAuth, getMyHousehold);
router.post('/', requireAuth, createHousehold);
router.post('/join', requireAuth, joinHousehold);
router.patch('/', requireAuth, renameHousehold);
router.post('/leave', requireAuth, leaveHousehold);
router.post('/regenerate-code', requireAuth, regenerateCode);

export default router;
