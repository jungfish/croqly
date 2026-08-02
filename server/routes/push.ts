import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { getVapidPublicKey } from '../lib/webPush.js';
import { logError } from '../lib/logger.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

// Public: the client needs this before it can even ask the browser to
// subscribe — no identity required to read a public key.
const getPublicKey: RequestHandler = (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
};

// Upsert keyed by endpoint (not userId) — a browser can only ever hold one
// PushSubscription per endpoint, and re-subscribing (e.g. after the browser
// silently rotated it) should just take over the row rather than error.
const subscribe: RequestHandler = async (req, res) => {
  try {
    const { endpoint, keys } = req.body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'endpoint and keys are required' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: req.user!.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.status(201).json({ subscribed: true });
  } catch (error) {
    logError('Error saving push subscription', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
};

const unsubscribe: RequestHandler = async (req, res) => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } });
    res.json({ unsubscribed: true });
  } catch (error) {
    logError('Error removing push subscription', error);
    res.status(500).json({ error: 'Failed to remove push subscription' });
  }
};

router.get('/vapid-public-key', getPublicKey);
router.post('/subscribe', requireAuth, subscribe);
router.post('/unsubscribe', requireAuth, unsubscribe);

export default router;
