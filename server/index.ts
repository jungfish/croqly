// Local dev / traditional-server entry point (`npm run dev:server`, `npm start`).
// On Vercel, api/index.ts imports the same app and exports it directly instead.
import { app } from './app.js';
import { prisma } from './lib/prisma.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    prisma.$disconnect();
    process.exit(0);
  });
});
