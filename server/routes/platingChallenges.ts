import { Router, RequestHandler } from 'express';
import { IncomingForm } from 'formidable';
import * as fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { uploadPlatingSubmissionPhoto } from '../lib/storage.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendPushToUsers } from '../lib/webPush.js';
import { logError } from '../lib/logger.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

// New challenges default to a long weekend — enough time for a bande to
// actually cook the thing without dragging on so long the reveal loses its
// urgency. Creators can't tune this today; see server/routes/household.ts
// for the equivalent "keep it simple" call on invite codes.
const DEFAULT_DURATION_DAYS = 3;
const MAX_DURATION_DAYS = 14;
const MAX_CAPTION_LENGTH = 200;
const MAX_COMMENT_LENGTH = 500;

// The 7 curated, purely-expressive reactions a bande can drop on a dressage
// photo (see PlatingReaction) — distinct from PlatingVote's single "best
// dressage" crown. Validated server-side like ALLOWED_REACTION_EMOJIS in
// recipes.ts, so a client can't store arbitrary reaction types. Order here
// is the stable display order everywhere (picker, summary pills).
const ALLOWED_PLATING_REACTIONS = ['trop_beau', 'miam', 'licorne', 'degueu', 'feu', 'mdr', 'clown'] as const;
type PlatingReactionType = (typeof ALLOWED_PLATING_REACTIONS)[number];

type PlatingReactionSummary = { type: PlatingReactionType; count: number; reactedByMe: boolean };

function summarizePlatingReactions(reactions: { type: string; userId: string }[], currentUserId: string): PlatingReactionSummary[] {
  const byType = new Map<string, PlatingReactionSummary>();
  for (const reaction of reactions) {
    const existing = byType.get(reaction.type);
    if (existing) {
      existing.count += 1;
      existing.reactedByMe ||= reaction.userId === currentUserId;
    } else {
      byType.set(reaction.type, { type: reaction.type as PlatingReactionType, count: 1, reactedByMe: reaction.userId === currentUserId });
    }
  }
  // Stable order (not insertion order) so the pill row doesn't reshuffle
  // every time someone in the bande reacts — same reasoning as reactions on
  // the bande recipe feed, see summarizeReactions in recipes.ts.
  return ALLOWED_PLATING_REACTIONS.map((type) => byType.get(type)).filter((r): r is PlatingReactionSummary => Boolean(r));
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

function findHouseholdMembership(householdId: string, userId: string) {
  return prisma.householdMember.findUnique({ where: { householdId_userId: { householdId, userId } } });
}

function isChallengeOpen(endsAt: Date): boolean {
  return endsAt.getTime() > Date.now();
}

const recipeRefSelect = { id: true, recipeId: true, recipe: { select: { title: true, illustrationThumb: true, illustration: true } } };

function serializeRecipeRef(savedRecipe: { id: string; recipeId: string; recipe: { title: string; illustrationThumb: string | null; illustration: string | null } } | null) {
  if (!savedRecipe) return null;
  return {
    savedRecipeId: savedRecipe.id,
    recipeId: savedRecipe.recipeId,
    title: savedRecipe.recipe.title,
    thumb: savedRecipe.recipe.illustrationThumb ?? savedRecipe.recipe.illustration,
  };
}

// Count of still-open challenges, across every bande the caller belongs to,
// that they haven't submitted a dressage to yet — powers the nav badge (see
// AppSidebar.tsx/Header.tsx) that nudges "you owe the bande a photo" without
// needing to open Laser Croq to notice. Registered before GET /:id below so
// this literal path isn't swallowed by that param route.
const getPendingCount: RequestHandler = async (req, res) => {
  try {
    const memberships = await prisma.householdMember.findMany({ where: { userId: req.user!.id } });
    const householdIds = memberships.map((m) => m.householdId);
    if (householdIds.length === 0) return res.json({ count: 0 });

    const openChallenges = await prisma.platingChallenge.findMany({
      where: { householdId: { in: householdIds }, endsAt: { gt: new Date() } },
      select: { submissions: { where: { userId: req.user!.id }, select: { id: true } } },
    });
    const count = openChallenges.filter((c) => c.submissions.length === 0).length;
    res.json({ count });
  } catch (error) {
    logError('Error fetching pending plating challenge count', error);
    res.status(500).json({ error: 'Failed to fetch pending count' });
  }
};

// A bande's challenges as cards: open ones first (soonest deadline first),
// then closed ones (most recently ended first) with their winner — the
// submission with the most votes, ties broken by earliest submission so the
// crown doesn't flicker between two tied photos on every reload.
const listChallenges: RequestHandler<{ householdId: string }> = async (req, res) => {
  try {
    const membership = await findHouseholdMembership(req.params.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const challenges = await prisma.platingChallenge.findMany({
      where: { householdId: req.params.householdId },
      include: {
        savedRecipe: { select: recipeRefSelect },
        submissions: {
          select: { id: true, userId: true, photoThumbUrl: true, createdAt: true, votes: { select: { userId: true } } },
        },
      },
      orderBy: { endsAt: 'desc' },
    });

    const memberIds = Array.from(new Set(challenges.flatMap((c) => c.submissions.map((s) => s.userId))));
    const emailById = await resolveEmails(memberIds);

    const cards = challenges.map((challenge) => {
      const open = isChallengeOpen(challenge.endsAt);
      const ranked = [...challenge.submissions].sort(
        (a, b) => b.votes.length - a.votes.length || a.createdAt.getTime() - b.createdAt.getTime()
      );
      const winner = !open && ranked.length > 0 ? ranked[0] : null;
      return {
        id: challenge.id,
        title: challenge.title,
        recipe: serializeRecipeRef(challenge.savedRecipe),
        endsAt: challenge.endsAt,
        isOpen: open,
        submissionsCount: challenge.submissions.length,
        hasSubmittedByMe: challenge.submissions.some((s) => s.userId === req.user!.id),
        winner: winner
          ? {
              userId: winner.userId,
              email: emailById.get(winner.userId) ?? null,
              photoThumbUrl: winner.photoThumbUrl,
              votesCount: winner.votes.length,
            }
          : null,
      };
    });

    // Open challenges (soonest deadline first) before closed ones (most
    // recently ended first) — sorting after the fact rather than in SQL
    // since "open" depends on comparing endsAt to now, not a stored column.
    cards.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      const aTime = new Date(a.endsAt).getTime();
      const bTime = new Date(b.endsAt).getTime();
      return a.isOpen ? aTime - bTime : bTime - aTime;
    });

    res.json(cards);
  } catch (error) {
    logError('Error fetching plating challenges', error);
    res.status(500).json({ error: 'Failed to fetch plating challenges' });
  }
};

// The bande-wide "feed des dressages" — every *revealed* photo across every
// challenge in this bande, newest first, independent of which challenge it
// belongs to. Same reveal gate as getChallenge: while a challenge is still
// open, its submissions only show up here once the caller has submitted
// their own entry to that challenge (or always, for their own submission) —
// otherwise the feed would spoil the blind-reveal challenge view by leaking
// photos through the back door. Once a challenge closes, everything in it
// reveals here too.
const listFeed: RequestHandler<{ householdId: string }> = async (req, res) => {
  try {
    const membership = await findHouseholdMembership(req.params.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const submissions = await prisma.platingSubmission.findMany({
      where: { challenge: { householdId: req.params.householdId } },
      include: {
        challenge: { select: { id: true, title: true, endsAt: true, savedRecipe: { select: recipeRefSelect } } },
        votes: { select: { userId: true } },
        reactions: { select: { type: true, userId: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myOwnChallengeIds = new Set(
      submissions.filter((s) => s.userId === req.user!.id).map((s) => s.challengeId)
    );
    const revealed = submissions.filter(
      (s) => s.userId === req.user!.id || !isChallengeOpen(s.challenge.endsAt) || myOwnChallengeIds.has(s.challengeId)
    );

    const emailById = await resolveEmails(Array.from(new Set(revealed.map((s) => s.userId))));

    res.json(
      revealed.map((s) => ({
        id: s.id,
        challengeId: s.challenge.id,
        challengeTitle: s.challenge.title,
        recipe: serializeRecipeRef(s.challenge.savedRecipe),
        userId: s.userId,
        email: emailById.get(s.userId) ?? null,
        photoUrl: s.photoUrl,
        photoThumbUrl: s.photoThumbUrl,
        caption: s.caption,
        createdAt: s.createdAt,
        votesCount: s.votes.length,
        votedByMe: s.votes.some((v) => v.userId === req.user!.id),
        commentsCount: s._count.comments,
        reactions: summarizePlatingReactions(s.reactions, req.user!.id),
      }))
    );
  } catch (error) {
    logError('Error fetching plating feed', error);
    res.status(500).json({ error: 'Failed to fetch plating feed' });
  }
};

// Starting a challenge never requires a recipe — "Dressage du dimanche" with
// no recipe attached is just as valid as one built off something the bande
// already saved. When savedRecipeId is set, it must belong to a member of
// this same bande (same access-control shape as toggleReaction in recipes.ts).
//
// The reveal moment (endsAt) can be given either as a relative durationDays
// (the quick presets in the UI) or as an exact endsAt timestamp (the
// "personnaliser" date/time picker) — an explicit endsAt always wins over
// durationDays when both are somehow sent, since it's the more specific ask.
const createChallenge: RequestHandler<{ householdId: string }> = async (req, res) => {
  try {
    const membership = await findHouseholdMembership(req.params.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const { title, savedRecipeId, durationDays, endsAt: endsAtInput } = req.body as {
      title?: string;
      savedRecipeId?: string;
      durationDays?: number;
      endsAt?: string;
    };
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    let recipeTitle: string | null = null;
    if (savedRecipeId) {
      const savedRecipe = await prisma.savedRecipe.findUnique({ where: { id: savedRecipeId }, include: { recipe: true } });
      if (!savedRecipe) return res.status(404).json({ error: 'Recipe not found' });
      const saverMembership = await findHouseholdMembership(req.params.householdId, savedRecipe.userId);
      if (!saverMembership) return res.status(403).json({ error: 'This recipe is not in this bande' });
      recipeTitle = savedRecipe.recipe.title;
    }

    const maxEndsAt = Date.now() + MAX_DURATION_DAYS * 24 * 60 * 60 * 1000;
    let endsAt: Date;
    if (endsAtInput) {
      const parsed = new Date(endsAtInput);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'La date de reveal doit être dans le futur.' });
      }
      endsAt = new Date(Math.min(parsed.getTime(), maxEndsAt));
    } else {
      const days = Math.min(Math.max(durationDays ?? DEFAULT_DURATION_DAYS, 1), MAX_DURATION_DAYS);
      endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const challenge = await prisma.platingChallenge.create({
      data: {
        householdId: req.params.householdId,
        title: title.trim() || `Dressage${recipeTitle ? ` — ${recipeTitle}` : ''}`,
        savedRecipeId: savedRecipeId ?? null,
        createdByUserId: req.user!.id,
        endsAt,
      },
    });

    const members = await prisma.householdMember.findMany({ where: { householdId: req.params.householdId } });
    sendPushToUsers(
      members.map((m) => m.userId),
      { title: 'Nouveau défi Laser Croq', body: `${req.user!.email ?? 'Quelqu’un'} a lancé « ${challenge.title} »`, url: `/laser-croq/${challenge.id}` },
      req.user!.id
    ).catch((error) => logError('Error sending challenge push notification', error));

    res.status(201).json({ id: challenge.id });
  } catch (error) {
    logError('Error creating plating challenge', error);
    res.status(500).json({ error: 'Failed to create plating challenge' });
  }
};

// Challenge detail: the recipe reference (if any) plus every submission —
// but other members' photos, captions and comments stay locked until the
// caller has submitted their own or the challenge has closed. This is the
// whole point of Laser Croq: you can't peek at (or copy) someone else's
// plating before showing yours. Your own submission is never locked to you.
const getChallenge: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    const challenge = await prisma.platingChallenge.findUnique({
      where: { id: req.params.id },
      include: { savedRecipe: { select: recipeRefSelect } },
    });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const membership = await findHouseholdMembership(challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const open = isChallengeOpen(challenge.endsAt);
    const myUserId = req.user!.id;
    const hasSubmitted = await prisma.platingSubmission.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: myUserId } },
    });
    const revealed = !open || Boolean(hasSubmitted);

    const submissions = await prisma.platingSubmission.findMany({
      where: { challengeId: challenge.id },
      include: {
        votes: { select: { userId: true } },
        reactions: { select: { type: true, userId: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const emailById = await resolveEmails(submissions.map((s) => s.userId));

    res.json({
      id: challenge.id,
      title: challenge.title,
      recipe: serializeRecipeRef(challenge.savedRecipe),
      endsAt: challenge.endsAt,
      isOpen: open,
      createdByUserId: challenge.createdByUserId,
      hasSubmittedByMe: Boolean(hasSubmitted),
      revealed,
      submissions: submissions.map((s) => {
        const isMine = s.userId === myUserId;
        const base = {
          id: s.id,
          userId: s.userId,
          email: emailById.get(s.userId) ?? null,
          isMine,
          votesCount: s.votes.length,
          votedByMe: s.votes.some((v) => v.userId === myUserId),
          reactions: summarizePlatingReactions(s.reactions, myUserId),
        };
        if (!revealed && !isMine) return { ...base, locked: true as const };
        return {
          ...base,
          locked: false as const,
          photoUrl: s.photoUrl,
          photoThumbUrl: s.photoThumbUrl,
          caption: s.caption,
          createdAt: s.createdAt,
          commentsCount: s._count.comments,
        };
      }),
    });
  } catch (error) {
    logError('Error fetching plating challenge', error);
    res.status(500).json({ error: 'Failed to fetch plating challenge' });
  }
};

// Submits (or replaces) the caller's own dressage photo for a challenge.
// Keyed by challengeId-userId in storage too, so resubmitting overwrites the
// same object instead of leaving orphaned uploads behind.
const submitPlating: RequestHandler<{ id: string }> = async (req, res) => {
  const form = new IncomingForm({ multiples: false, keepExtensions: true });

  try {
    const challenge = await prisma.platingChallenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const membership = await findHouseholdMembership(challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });
    if (!isChallengeOpen(challenge.endsAt)) return res.status(409).json({ error: 'Ce défi est terminé.' });

    const [fields, files] = await form.parse(req);
    const photo = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (!photo) return res.status(400).json({ error: 'photo is required' });

    const captionRaw = Array.isArray(fields.caption) ? fields.caption[0] : fields.caption;
    const caption = captionRaw?.trim().slice(0, MAX_CAPTION_LENGTH) || null;

    const buffer = await fs.promises.readFile(photo.filepath);
    await fs.promises.unlink(photo.filepath).catch(() => {});
    const { full, thumb } = await uploadPlatingSubmissionPhoto(buffer, `${challenge.id}-${req.user!.id}`);

    const submission = await prisma.platingSubmission.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: req.user!.id } },
      create: { challengeId: challenge.id, userId: req.user!.id, photoUrl: full, photoThumbUrl: thumb, caption },
      update: { photoUrl: full, photoThumbUrl: thumb, caption },
    });

    res.status(201).json({ id: submission.id });
  } catch (error) {
    logError('Error submitting plating photo', error);
    res.status(500).json({ error: 'Failed to submit plating photo' });
  }
};

// Toggles the caller's crown vote for "best dressage" on a submission. Self-
// votes aren't allowed — the crown is meant to reflect what the rest of the
// bande thinks. Locked (not-yet-revealed) submissions can't be voted on
// either, same enforcement as the reveal gate in getChallenge.
const toggleVote: RequestHandler<{ submissionId: string }> = async (req, res) => {
  try {
    const submission = await prisma.platingSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: { challenge: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (submission.userId === req.user!.id) return res.status(400).json({ error: "Tu ne peux pas voter pour ton propre dressage." });

    const membership = await findHouseholdMembership(submission.challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const open = isChallengeOpen(submission.challenge.endsAt);
    const myOwnSubmission = await prisma.platingSubmission.findUnique({
      where: { challengeId_userId: { challengeId: submission.challengeId, userId: req.user!.id } },
    });
    if (open && !myOwnSubmission) {
      return res.status(403).json({ error: 'Envoie ta photo pour débloquer les votes de ce défi.' });
    }

    const existing = await prisma.platingVote.findUnique({
      where: { submissionId_userId: { submissionId: submission.id, userId: req.user!.id } },
    });
    if (existing) {
      await prisma.platingVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.platingVote.create({ data: { submissionId: submission.id, userId: req.user!.id } });
    }

    const votes = await prisma.platingVote.findMany({ where: { submissionId: submission.id } });
    res.json({ votesCount: votes.length, votedByMe: votes.some((v) => v.userId === req.user!.id) });
  } catch (error) {
    logError('Error toggling plating vote', error);
    res.status(500).json({ error: 'Failed to toggle vote' });
  }
};

// Adds one of the caller's 7 fun reactions to a submission — Google
// Meet-style: every call adds a new reaction rather than toggling one on/off,
// so repeat-tapping the same button in the UI just keeps racking up the
// count instead of cancelling itself out on the second click. No self-
// reaction ban (unlike toggleVote) — reacting to your own dressage is
// harmless and part of the fun — but the same reveal gate applies: no
// peeking (or reacting) at someone else's photo before you've shown yours.
const addPlatingReaction: RequestHandler<{ submissionId: string }> = async (req, res) => {
  try {
    const { type } = req.body as { type?: string };
    if (!type || !ALLOWED_PLATING_REACTIONS.includes(type as PlatingReactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const submission = await prisma.platingSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: { challenge: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const membership = await findHouseholdMembership(submission.challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const open = isChallengeOpen(submission.challenge.endsAt);
    if (open && submission.userId !== req.user!.id) {
      const myOwnSubmission = await prisma.platingSubmission.findUnique({
        where: { challengeId_userId: { challengeId: submission.challengeId, userId: req.user!.id } },
      });
      if (!myOwnSubmission) return res.status(403).json({ error: 'Envoie ta photo pour débloquer les réactions de ce défi.' });
    }

    await prisma.platingReaction.create({ data: { submissionId: submission.id, userId: req.user!.id, type } });

    const reactions = await prisma.platingReaction.findMany({ where: { submissionId: submission.id } });
    res.json({ reactions: summarizePlatingReactions(reactions, req.user!.id) });
  } catch (error) {
    logError('Error adding plating reaction', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Adds a comment on a dressage submission — same reveal gate as voting,
// otherwise a comment ("nice try but that sauce is doing a lot") would leak
// that a submission exists before the caller has shown their own.
const addComment: RequestHandler<{ submissionId: string }> = async (req, res) => {
  try {
    const { body } = req.body as { body?: string };
    const trimmed = body?.trim();
    if (!trimmed) return res.status(400).json({ error: 'body is required' });

    const submission = await prisma.platingSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: { challenge: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const membership = await findHouseholdMembership(submission.challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const open = isChallengeOpen(submission.challenge.endsAt);
    if (open && submission.userId !== req.user!.id) {
      const myOwnSubmission = await prisma.platingSubmission.findUnique({
        where: { challengeId_userId: { challengeId: submission.challengeId, userId: req.user!.id } },
      });
      if (!myOwnSubmission) return res.status(403).json({ error: 'Envoie ta photo pour débloquer les commentaires de ce défi.' });
    }

    const comment = await prisma.platingComment.create({
      data: { submissionId: submission.id, userId: req.user!.id, body: trimmed.slice(0, MAX_COMMENT_LENGTH) },
    });

    const emailById = await resolveEmails([req.user!.id]);
    res.status(201).json({
      id: comment.id,
      userId: comment.userId,
      email: emailById.get(comment.userId) ?? null,
      body: comment.body,
      createdAt: comment.createdAt,
    });
  } catch (error) {
    logError('Error adding plating comment', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// All comments on a submission, oldest first (a normal chat-style thread) —
// split from getChallenge's summary counts so opening one submission's
// comments doesn't require re-fetching the whole challenge.
const listComments: RequestHandler<{ submissionId: string }> = async (req, res) => {
  try {
    const submission = await prisma.platingSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: { challenge: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const membership = await findHouseholdMembership(submission.challenge.householdId, req.user!.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this bande' });

    const open = isChallengeOpen(submission.challenge.endsAt);
    if (open && submission.userId !== req.user!.id) {
      const myOwnSubmission = await prisma.platingSubmission.findUnique({
        where: { challengeId_userId: { challengeId: submission.challengeId, userId: req.user!.id } },
      });
      if (!myOwnSubmission) return res.json([]);
    }

    const comments = await prisma.platingComment.findMany({
      where: { submissionId: submission.id },
      orderBy: { createdAt: 'asc' },
    });
    const emailById = await resolveEmails(Array.from(new Set(comments.map((c) => c.userId))));

    res.json(
      comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        email: emailById.get(c.userId) ?? null,
        body: c.body,
        createdAt: c.createdAt,
        isMine: c.userId === req.user!.id,
      }))
    );
  } catch (error) {
    logError('Error fetching plating comments', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

const deleteComment: RequestHandler<{ commentId: string }> = async (req, res) => {
  try {
    await prisma.platingComment.deleteMany({ where: { id: req.params.commentId, userId: req.user!.id } });
    res.json({ deleted: true });
  } catch (error) {
    logError('Error deleting plating comment', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

const deleteMySubmission: RequestHandler<{ id: string }> = async (req, res) => {
  try {
    await prisma.platingSubmission.deleteMany({ where: { challengeId: req.params.id, userId: req.user!.id } });
    res.json({ deleted: true });
  } catch (error) {
    logError('Error deleting plating submission', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
};

router.get('/household/:householdId', requireAuth, listChallenges);
router.get('/household/:householdId/feed', requireAuth, listFeed);
router.post('/household/:householdId', requireAuth, createChallenge);
router.get('/pending-count', requireAuth, getPendingCount);
router.get('/:id', requireAuth, getChallenge);
router.post('/:id/submissions', requireAuth, submitPlating);
router.delete('/:id/submissions/mine', requireAuth, deleteMySubmission);
router.post('/submissions/:submissionId/vote', requireAuth, toggleVote);
router.post('/submissions/:submissionId/reactions', requireAuth, addPlatingReaction);
router.get('/submissions/:submissionId/comments', requireAuth, listComments);
router.post('/submissions/:submissionId/comments', requireAuth, addComment);
router.delete('/comments/:commentId', requireAuth, deleteComment);

export default router;
