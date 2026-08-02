import crypto from 'crypto';
import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { resolveProfiles } from '../lib/profiles.js';
import { sendPushToUsers } from '../lib/webPush.js';
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

type HouseholdWithMembers = { id: string; name: string | null; inviteCode: string; members: { userId: string; joinedAt: Date }[] };

// Shapes a Household + its members (email/pseudo/avatar resolved via
// resolveProfiles) into the API-facing form shared by every endpoint below.
async function serializeHousehold(household: HouseholdWithMembers, currentUserId: string) {
  const memberIds = household.members.map((m) => m.userId);
  const profileById = await resolveProfiles(memberIds);
  return {
    id: household.id,
    name: household.name,
    inviteCode: household.inviteCode,
    members: household.members
      .map((m) => {
        const profile = profileById.get(m.userId);
        return {
          userId: m.userId,
          email: profile?.email ?? null,
          pseudo: profile?.pseudo ?? null,
          avatarKey: profile?.avatarKey ?? null,
          joinedAt: m.joinedAt,
          isMe: m.userId === currentUserId,
        };
      })
      .sort((a, b) => (a.joinedAt < b.joinedAt ? -1 : 1)),
  };
}

function findMembership(householdId: string, userId: string) {
  return prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } });
}

// Every bande the caller belongs to (a user can be in several — e.g. one
// with family, one with friends), oldest-joined first so the list order
// stays stable across requests.
const listMyHouseholds: RequestHandler = async (req, res) => {
  try {
    const memberships = await prisma.householdMember.findMany({
      where: { userId: req.user!.id },
      include: { household: { include: { members: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const households = await Promise.all(memberships.map((m) => serializeHousehold(m.household, req.user!.id)));
    res.json({ households });
  } catch (error) {
    logError('Error fetching households', error);
    res.status(500).json({ error: 'Failed to fetch households' });
  }
};

// Retried a few times on the rare invite-code collision.
const createHousehold: RequestHandler = async (req, res) => {
  try {
    const { name } = req.body as { name?: string };

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const household = await prisma.household.create({
          data: {
            name: name?.trim() || null,
            inviteCode: generateInviteCode(),
            members: { create: { userId: req.user!.id } },
          },
          include: { members: true },
        });
        return res.status(201).json({ household: await serializeHousehold(household, req.user!.id) });
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

    const household = await prisma.household.findUnique({
      where: { inviteCode: code.trim().toUpperCase() },
      include: { members: true },
    });
    if (!household) return res.status(404).json({ error: 'Code invalide.' });

    if (household.members.some((m) => m.userId === req.user!.id)) {
      return res.status(409).json({ error: 'Tu fais déjà partie de cette bande.' });
    }

    await prisma.householdMember.create({ data: { householdId: household.id, userId: req.user!.id } });
    const updated = await prisma.household.findUniqueOrThrow({ where: { id: household.id }, include: { members: true } });

    // Fire-and-forget: a failed push must never turn a successful join into
    // a 500 for the person who just joined.
    sendPushToUsers(
      household.members.map((m) => m.userId),
      {
        title: household.name ? `Nouveau membre dans ${household.name}` : 'Nouveau membre dans ta bande',
        body: `${req.user!.email ?? 'Quelqu’un'} vient de rejoindre la bande.`,
        url: '/bande',
      },
      req.user!.id
    ).catch((error) => logError('Error sending join push notification', error));

    res.json({ household: await serializeHousehold(updated, req.user!.id) });
  } catch (error) {
    logError('Error joining household', error);
    res.status(500).json({ error: 'Failed to join household' });
  }
};

// Deletes the household once its last member leaves, so an abandoned
// household never lingers with a still-valid invite code.
const leaveHousehold: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const membership = await findMembership(req.params.id, req.user!.id);
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucune bande.' });

    await prisma.householdMember.delete({ where: { id: membership.id } });
    const remaining = await prisma.householdMember.count({ where: { householdId: req.params.id } });
    if (remaining === 0) await prisma.household.delete({ where: { id: req.params.id } });

    res.json({ left: true });
  } catch (error) {
    logError('Error leaving household', error);
    res.status(500).json({ error: 'Failed to leave household' });
  }
};

const renameHousehold: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const membership = await findMembership(req.params.id, req.user!.id);
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucune bande.' });

    const { name } = req.body as { name?: string };
    const household = await prisma.household.update({
      where: { id: req.params.id },
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
const regenerateCode: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const membership = await findMembership(req.params.id, req.user!.id);
    if (!membership) return res.status(404).json({ error: 'Tu ne fais partie d’aucune bande.' });

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const household = await prisma.household.update({
          where: { id: req.params.id },
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

router.get('/', requireAuth, listMyHouseholds);
router.post('/', requireAuth, createHousehold);
router.post('/join', requireAuth, joinHousehold);
router.patch('/:id', requireAuth, renameHousehold);
router.post('/:id/leave', requireAuth, leaveHousehold);
router.post('/:id/regenerate-code', requireAuth, regenerateCode);

export default router;
