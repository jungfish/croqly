import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { logError } from '../lib/logger.js';

const router = Router();

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

function parseDays(raw: unknown): number {
  const parsed = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

interface RecipesPerDayRow {
  day: Date;
  count: bigint;
}

interface UsagePerDayRow {
  day: Date;
  totalTokens: bigint | null;
  costUsd: number | null;
  callCount: bigint;
}

// Day-by-day trend for the two headline metrics — recipes created and AI
// usage/cost. Zero-filled via generate_series so a quiet day renders as a
// real 0 bar instead of a gap.
const getOverview: RequestHandler = async (req, res) => {
  try {
    const days = parseDays(req.query.days);

    const [recipeRows, usageRows] = await Promise.all([
      prisma.$queryRaw<RecipesPerDayRow[]>`
        SELECT gs.day AS day, COUNT(r.id) AS count
        FROM generate_series(
          date_trunc('day', now()) - (${days}::int - 1) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) AS gs(day)
        LEFT JOIN "Recipe" r ON date_trunc('day', r."createdAt") = gs.day
        GROUP BY gs.day
        ORDER BY gs.day
      `,
      prisma.$queryRaw<UsagePerDayRow[]>`
        SELECT
          gs.day AS day,
          COALESCE(SUM(a."totalTokens"), 0) AS "totalTokens",
          COALESCE(SUM(a."costUsd"), 0) AS "costUsd",
          COUNT(a.id) AS "callCount"
        FROM generate_series(
          date_trunc('day', now()) - (${days}::int - 1) * interval '1 day',
          date_trunc('day', now()),
          interval '1 day'
        ) AS gs(day)
        LEFT JOIN "AiUsageLog" a ON date_trunc('day', a."createdAt") = gs.day
        GROUP BY gs.day
        ORDER BY gs.day
      `,
    ]);

    const recipesPerDay = recipeRows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      count: Number(row.count),
    }));
    const aiUsagePerDay = usageRows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      totalTokens: Number(row.totalTokens ?? 0),
      costUsd: Number(row.costUsd ?? 0),
      callCount: Number(row.callCount),
    }));

    res.json({
      days,
      recipesPerDay,
      aiUsagePerDay,
      totals: {
        recipes: recipesPerDay.reduce((sum, d) => sum + d.count, 0),
        totalTokens: aiUsagePerDay.reduce((sum, d) => sum + d.totalTokens, 0),
        costUsd: aiUsagePerDay.reduce((sum, d) => sum + d.costUsd, 0),
        callCount: aiUsagePerDay.reduce((sum, d) => sum + d.callCount, 0),
      },
    });
  } catch (error) {
    logError('Error building admin overview', error);
    res.status(500).json({ error: 'Failed to build overview' });
  }
};

// Recent recipes with who imported them (Recipe.createdByUserId) — resolved
// to an email via the Supabase admin API since users live in Supabase auth,
// not in this Postgres schema. Recipes created before this field existed
// have no attribution and show as "Anonyme / inconnu" on the client.
const getRecipes: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          platform: true,
          createdAt: true,
          createdByUserId: true,
          creator: { select: { platform: true, handle: true, displayName: true } },
        },
      }),
      prisma.recipe.count(),
    ]);

    const userIds = [...new Set(recipes.map((r) => r.createdByUserId).filter((id): id is string => !!id))];
    const supabaseAdmin = getSupabaseAdmin();
    const emailById = new Map<string, string>();
    if (supabaseAdmin) {
      await Promise.all(
        userIds.map(async (id) => {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id);
          if (data?.user?.email) emailById.set(id, data.user.email);
        })
      );
    }

    res.json({
      page,
      pageSize,
      total,
      recipes: recipes.map((r) => ({
        id: r.id,
        title: r.title,
        platform: r.platform,
        createdAt: r.createdAt,
        creator: r.creator,
        createdByEmail: r.createdByUserId ? emailById.get(r.createdByUserId) ?? null : null,
      })),
    });
  } catch (error) {
    logError('Error listing admin recipes', error);
    res.status(500).json({ error: 'Failed to list recipes' });
  }
};

router.get('/overview', getOverview);
router.get('/recipes', getRecipes);

export default router;
