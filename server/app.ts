import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { attachUser } from './middleware/supabaseAuth.js';
import dbRoutes from './routes/db.js';
import instagramRoutes from './routes/instagram.js';
import aiRoutes from './routes/ai.js';
import recipesRoutes from './routes/recipes.js';
import creatorsRoutes from './routes/creators.js';
import { prisma } from './lib/prisma.js';
import { renderSeoHtml } from './lib/renderSeoHtml.js';
import { buildRecipeJsonLd, buildCreatorHubJsonLd } from './lib/schemaOrg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// server/app.ts compiles to dist/server/app.js — the Vite-built frontend
// (index.html, assets/) lands one level up, directly in dist/.
const distDir = path.join(__dirname, '..');

// The Express app itself — shared between local dev (server/index.ts, which
// calls .listen()) and the Vercel serverless entry (api/index.ts, which just
// exports it; Vercel invokes it directly as a request handler per request).
export const app: Express = express();

// Behind Vercel's proxy in production — needed for req.ip (anonymous rate
// limiting) to reflect the real client IP via X-Forwarded-For.
app.set('trust proxy', true);

app.use(express.json());
app.use(cors());

// Serve static files from the Vite build directory — only exercised when
// running the compiled server directly (e.g. `npm start`); on Vercel, static
// assets are served by the CDN before a request ever reaches this function.
app.use(express.static(distDir));

// Parses a Supabase access token if present (req.user); never blocks —
// / and /recipe/:id are public, only specific routes require an identity.
app.use(attachUser);

app.use('/api/db', dbRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/creators', creatorsRoutes);

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

// Identity check: confirms whether the request carried a valid Supabase
// session (req.user set by attachUser) — never requires auth itself.
app.get('/api/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

// Server-side meta/JSON-LD injection for the two public, SEO-critical
// routes — see server/lib/renderSeoHtml.ts for why this can't just be a
// client-rendered <script> tag. Falls through to the plain SPA fallback
// below on any failure (missing record, or dist/index.html not built yet
// in local dev), so this never turns into a 500 for a route the SPA can
// still render client-side.
app.get('/recipe/:id', async (req, res, next) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: { creator: true },
    });
    if (!recipe) return next();

    const siteUrl = `${req.protocol}://${req.get('host')}`;
    const recipeUrl = `${siteUrl}/recipe/${recipe.id}`;
    const creator = recipe.creator
      ? { instagramHandle: recipe.creator.instagramHandle, displayName: recipe.creator.displayName, avatarUrl: recipe.creator.avatarUrl }
      : null;

    const jsonLd = buildRecipeJsonLd(siteUrl, recipeUrl, {
      id: recipe.id,
      title: recipe.title,
      illustration: recipe.illustration,
      ingredients: JSON.parse(recipe.ingredients || '[]'),
      instructions: JSON.parse(recipe.instructions || '[]'),
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings,
      creator,
    });

    const description = creator
      ? `Recette "${recipe.title}" de @${creator.instagramHandle}, croquée depuis Instagram et prête à cuisiner.`
      : `Recette "${recipe.title}", prête à cuisiner.`;

    const html = renderSeoHtml({
      distDir,
      title: `${recipe.title} — Croqly`,
      description,
      url: recipeUrl,
      image: recipe.illustration,
      jsonLd,
    });
    res.send(html);
  } catch (error) {
    console.error('Error rendering recipe SEO page:', error);
    next();
  }
});

app.get('/createurs/:handle', async (req, res, next) => {
  try {
    const creator = await prisma.creator.findUnique({
      where: { instagramHandle: req.params.handle },
      include: { recipes: { orderBy: { createdAt: 'desc' } } },
    });
    if (!creator) return next();

    const siteUrl = `${req.protocol}://${req.get('host')}`;
    const hubUrl = `${siteUrl}/createurs/${encodeURIComponent(creator.instagramHandle)}`;
    const displayName = creator.displayName || `@${creator.instagramHandle}`;

    const jsonLd = buildCreatorHubJsonLd(siteUrl, hubUrl, creator, creator.recipes);
    const description = `On a croqué ${creator.recipes.length} recette${creator.recipes.length > 1 ? 's' : ''} du compte @${creator.instagramHandle}, prêtes à cuisiner.`;

    const html = renderSeoHtml({
      distDir,
      title: `Toutes les recettes de ${displayName} — Croqly`,
      description,
      url: hubUrl,
      image: creator.avatarUrl,
      jsonLd,
    });
    res.send(html);
  } catch (error) {
    console.error('Error rendering creator hub SEO page:', error);
    next();
  }
});

// XML sitemap covering every public route: the home page, every recipe, and
// every creator hub. There's no visibility/privacy flag on Recipe or Creator
// today, so every row is eligible for indexing.
app.get('/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = `${req.protocol}://${req.get('host')}`;
    const [recipes, creators] = await Promise.all([
      prisma.recipe.findMany({ select: { id: true, updatedAt: true } }),
      prisma.creator.findMany({ select: { instagramHandle: true, updatedAt: true } }),
    ]);

    const urls: Array<{ loc: string; lastmod?: Date }> = [
      { loc: siteUrl },
      ...recipes.map((recipe) => ({ loc: `${siteUrl}/recipe/${recipe.id}`, lastmod: recipe.updatedAt })),
      ...creators.map((creator) => ({
        loc: `${siteUrl}/createurs/${encodeURIComponent(creator.instagramHandle)}`,
        lastmod: creator.updatedAt,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (entry) =>
          `  <url>\n    <loc>${entry.loc}</loc>${
            entry.lastmod ? `\n    <lastmod>${entry.lastmod.toISOString()}</lastmod>` : ''
          }\n  </url>`
      )
      .join('\n')}\n</urlset>`;

    res.type('application/xml').send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).end();
  }
});

// SPA fallback — only relevant when serving static files directly (see above).
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});
