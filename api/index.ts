// Vercel serverless entry point: the whole Express app deployed as a single
// function. vercel.json rewrites all /api/* requests here; the app's own
// router handles the specific sub-path (/api/db, /api/instagram/fetch, etc.)
// exactly as it does locally via server/index.ts.
import { app } from '../server/app.js';

export default app;
