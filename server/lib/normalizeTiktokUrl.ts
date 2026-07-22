// Canonical form used as the cache key (step 5) — mirrors normalizeInstagramUrl.
// Full-form URLs (https://www.tiktok.com/@handle/video/1234) are normalized to
// a stable @handle/video/id shape regardless of query params. Short share
// links (vm.tiktok.com/vt.tiktok.com) redirect server-side to the full URL,
// so they can't be resolved to that canonical shape without following the
// redirect — those are cached by their stripped share-link URL instead, which
// means the same video shared via both a short and a full link will cache
// twice. Acceptable for now; revisit if that turns out to matter in practice.
export function normalizeTiktokUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const match = url.pathname.match(/\/@([^/]+)\/video\/(\d+)/);
  if (match) {
    return `https://www.tiktok.com/@${match[1]}/video/${match[2]}`;
  }

  const isShareLink = /^(vm|vt|m)\.tiktok\.com$/.test(url.hostname);
  if (isShareLink && url.pathname.length > 1) {
    return `https://${url.hostname}${url.pathname}`;
  }

  throw new Error('Not a valid TikTok video URL');
}
