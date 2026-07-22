import fetch from 'node-fetch';

export interface InstagramMedia {
  videoUrl: string;
  caption: string;
  thumbnailUrl?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  ownerProfilePicUrl?: string;
}

// Kept as an interface so the vendor can be swapped (e.g. a different
// scraping API) by changing this one file, without touching the route or
// the caching/pipeline logic built on top of it.
export interface InstagramFetcher {
  getMediaByUrl(url: string): Promise<InstagramMedia>;
}

class ApifyInstagramFetcher implements InstagramFetcher {
  async getMediaByUrl(url: string): Promise<InstagramMedia> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN is not set — add it to .env to fetch Instagram content.');
    }

    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: [url], resultsLimit: 1 }),
      }
    );

    if (!response.ok) {
      throw new Error(`Apify request failed: ${response.status} ${await response.text()}`);
    }

    const items = (await response.json()) as Array<{
      videoUrl?: string;
      caption?: string;
      displayUrl?: string;
      ownerUsername?: string;
      ownerFullName?: string;
      ownerProfilePicUrl?: string;
    }>;
    const item = items[0];
    if (!item?.videoUrl) {
      throw new Error('No video found for this Reel');
    }

    return {
      videoUrl: item.videoUrl,
      caption: item.caption ?? '',
      thumbnailUrl: item.displayUrl,
      ownerUsername: item.ownerUsername,
      ownerFullName: item.ownerFullName,
      ownerProfilePicUrl: item.ownerProfilePicUrl,
    };
  }
}

export const instagramFetcher: InstagramFetcher = new ApifyInstagramFetcher();
