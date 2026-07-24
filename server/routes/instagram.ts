import { Router, RequestHandler } from 'express';
import { instagramFetcher } from '../lib/instagramFetcher.js';
import { transcribeVideoFromUrl } from '../lib/transcription.js';
import { normalizeInstagramUrl } from '../lib/normalizeInstagramUrl.js';
import { logError } from '../lib/logger.js';

const router = Router();

const fetchInstagramMedia: RequestHandler = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    const normalizedUrl = normalizeInstagramUrl(url);
    const media = await instagramFetcher.getMediaByUrl(normalizedUrl);
    const transcription = await transcribeVideoFromUrl(media.videoUrl);

    res.json({
      caption: media.caption,
      videoUrl: media.videoUrl,
      thumbnailUrl: media.thumbnailUrl,
      transcription,
      postUrl: normalizedUrl,
    });
  } catch (error) {
    logError('Error fetching Instagram media', error);
    res.status(500).json({ error: 'Failed to fetch Instagram content' });
  }
};

router.get('/fetch', fetchInstagramMedia);

export default router;
