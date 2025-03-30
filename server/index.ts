import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authMiddleware } from './middleware/auth';
import dbRoutes from './routes/db';
import instagramRoutes from './routes/instagram';
import aiRoutes from './routes/ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Auth middleware for non-API routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/') || 
      req.path.endsWith('.js') || 
      req.path.endsWith('.css') || 
      req.path.endsWith('.ico')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// API routes
app.use('/api/db', dbRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/ai', aiRoutes);

// Test endpoint
app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

// Handle SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    prisma.$disconnect();
    process.exit(0);
  });
}); 