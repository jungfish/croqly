import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { getOpenAI } from '../lib/openaiClient.js';
import { embed } from '../lib/embeddings.js';
import { isAnonymousLimitExceeded, recordAnonymousUsage } from '../lib/rateLimit.js';

const router = Router();

// How many semantically-closest recipes to feed to the model and return to
// the client — enough for a real choice, small enough to keep the prompt cheap.
const CANDIDATE_COUNT = 5;

// Same cheap text tier used by interpretRecipe (server/lib/aiInterpretation.ts).
const CHAT_MODEL = 'gpt-5.6-luna';

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

// Chat-based recipe recommendation: embeds the user's message, finds the
// closest recipes by pgvector cosine similarity, then asks the model to
// write a short recommendation grounded only in those candidates — never
// inventing a recipe that isn't actually in the database.
const recommend: RequestHandler = async (req, res) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Same cost-protection shape as the Instagram-import flow (server/routes/recipes.ts)
    // — this makes 2 OpenAI calls per request (embedding + chat completion).
    if (!req.user && (await isAnonymousLimitExceeded(req.ip ?? 'unknown'))) {
      return res.status(429).json({
        error: 'Limite quotidienne atteinte — connecte-toi pour un accès illimité.',
      });
    }

    const queryEmbedding = await embed(message);
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const matches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Recipe"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${CANDIDATE_COUNT}
    `;
    const orderedIds = matches.map((m) => m.id);

    if (orderedIds.length === 0) {
      if (!req.user) await recordAnonymousUsage(req.ip ?? 'unknown');
      return res.json({
        reply: "Je n'ai pas encore assez de recettes pour te faire une recommandation — reviens bientôt !",
        recipes: [],
      });
    }

    // findMany with `id: { in: ... }` doesn't preserve order, so re-sort by
    // similarity rank afterwards.
    const candidates = await prisma.recipe.findMany({
      where: { id: { in: orderedIds } },
      include: { creator: true },
    });
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const ranked = orderedIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

    const completion = await getOpenAI().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Tu recommandes des recettes à partir uniquement de la liste fournie — ne jamais inventer ' +
            'de recette, ingrédient ou titre absent de cette liste. Réponds uniquement en français, en ' +
            "1 à 3 phrases, en expliquant pourquoi ces recettes répondent à la demande de l'utilisateur.",
        },
        {
          role: 'user',
          content:
            `Demande : "${message}"\n\nRecettes disponibles :\n` +
            ranked
              .map(
                (r, i) =>
                  `${i + 1}. ${r.title} (${r.category}) — ingrédients : ${JSON.parse(r.ingredients || '[]').join(', ')}`
              )
              .join('\n'),
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content || '';

    if (!req.user) await recordAnonymousUsage(req.ip ?? 'unknown');

    res.json({ reply, recipes: ranked.map(parseRecipe) });
  } catch (error) {
    console.error('Error in chat recommendation:', error);
    res.status(500).json({ error: 'Failed to get recipe recommendation' });
  }
};

router.post('/', recommend);

export default router;
