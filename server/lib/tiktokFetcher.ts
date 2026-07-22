import fetch from 'node-fetch';

export interface TiktokMedia {
  videoUrl: string;
  caption: string;
  thumbnailUrl?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  ownerProfilePicUrl?: string;
}

// Kept as an interface so the vendor can be swapped, same reasoning as
// InstagramFetcher (see instagramFetcher.ts).
export interface TiktokFetcher {
  getMediaByUrl(url: string): Promise<TiktokMedia>;
}

class ApifyTiktokFetcher implements TiktokFetcher {
  async getMediaByUrl(url: string): Promise<TiktokMedia> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN is not set — add it to .env to fetch TikTok content.');
    }

    const response = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postURLs: [url], shouldDownloadVideos: true, resultsPerPage: 1 }),
      }
    );

    if (!response.ok) {
      throw new Error(`Apify request failed: ${response.status} ${await response.text()}`);
    }

    const items = (await response.json()) as Array<{
      text?: string;
      mediaUrls?: string[];
      videoMeta?: { downloadAddr?: string; coverUrl?: string; originalCoverUrl?: string };
      authorMeta?: { name?: string; nickName?: string; avatar?: string };
    }>;
    const item = items[0];
    // mediaUrls (Apify-hosted, from shouldDownloadVideos) is preferred — it's
    // stable and doesn't require TikTok-specific request headers to fetch.
    // videoMeta.downloadAddr is a direct TikTok CDN link used as a fallback.
    const videoUrl = item?.mediaUrls?.[0] || item?.videoMeta?.downloadAddr;
    if (!videoUrl) {
      throw new Error('No video found for this TikTok post');
    }

    return {
      videoUrl,
      caption: item?.text ?? '',
      thumbnailUrl: item?.videoMeta?.coverUrl ?? item?.videoMeta?.originalCoverUrl,
      ownerUsername: item?.authorMeta?.name,
      ownerFullName: item?.authorMeta?.nickName,
      ownerProfilePicUrl: item?.authorMeta?.avatar,
    };
  }
}

export const tiktokFetcher: TiktokFetcher = new ApifyTiktokFetcher();
