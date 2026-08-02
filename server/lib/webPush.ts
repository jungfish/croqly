import webpush from 'web-push';
import { prisma } from './prisma.js';
import { logError } from './logger.js';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:contact@croqly.app';

const configured = Boolean(publicKey && privateKey);
if (configured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

export function isPushConfigured(): boolean {
  return configured;
}

export function getVapidPublicKey(): string | null {
  return publicKey ?? null;
}

type PushPayload = { title: string; body: string; url?: string };

// Sends a push notification to every subscription belonging to the given
// users, skipping excludeUserId (the actor who triggered the event — you
// don't need a push telling you about your own action). A no-op when VAPID
// isn't configured, so this is always safe to call from a route regardless
// of environment. Subscriptions the browser has revoked (404/410) are
// deleted so they stop being retried on every future notification.
export async function sendPushToUsers(userIds: string[], payload: PushPayload, excludeUserId?: string): Promise<void> {
  if (!configured) return;
  const targetIds = Array.from(new Set(userIds)).filter((id) => id !== excludeUserId);
  if (targetIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: targetIds } } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          logError('Error sending push notification', error);
        }
      }
    })
  );
}
