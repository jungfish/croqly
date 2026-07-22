import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

export interface AuthUser {
  id: string;
  email: string | undefined;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required form for augmenting Express's Request type
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Parses a Supabase access token if present and attaches req.user; never
// blocks the request — routes that don't need an identity (anonymous
// browsing/processing) keep working with req.user left undefined.
export const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  const supabaseAdmin = getSupabaseAdmin();
  if (!token || !supabaseAdmin) {
    return next();
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (!error && data.user) {
    req.user = { id: data.user.id, email: data.user.email };
  }
  next();
};

// Use on routes that must have an identity (e.g. saving/listing a user's own recipes).
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};
