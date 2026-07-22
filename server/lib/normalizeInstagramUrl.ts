// Canonical form used as the cache key (step 5) — strips query params,
// trailing slashes, and unifies /p/ vs /reel/ so the same post always maps
// to the same key regardless of how the link was shared.
export function normalizeInstagramUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const match = url.pathname.match(/\/(?:p|reel)\/([^/]+)/);
  if (!match) {
    throw new Error('Not a valid Instagram post/reel URL');
  }
  return `https://www.instagram.com/reel/${match[1]}`;
}
