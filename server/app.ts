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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use(express.static(path.join(__dirname, '../dist')));

// Parses a Supabase access token if present (req.user); never blocks —
// / and /recipe/:id are public, only specific routes require an identity.
app.use(attachUser);

app.use('/api/db', dbRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recipes', recipesRoutes);

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

// Identity check: confirms whether the request carried a valid Supabase
// session (req.user set by attachUser) — never requires auth itself.
app.get('/api/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

// SPA fallback — only relevant when serving static files directly (see above).
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
