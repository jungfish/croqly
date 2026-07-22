import { prisma } from './prisma.js';

const ANONYMOUS_DAILY_LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Only throttles the expensive branch (a cache miss triggering scraping +
// AI) for anonymous callers — never applied to cache hits or logged-in users.
export async function isAnonymousLimitExceeded(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.anonymousProcessingLog.count({
    where: { ip, createdAt: { gte: since } },
  });
  return count >= ANONYMOUS_DAILY_LIMIT;
}

export async function recordAnonymousUsage(ip: string): Promise<void> {
  await prisma.anonymousProcessingLog.create({ data: { ip } });
}
