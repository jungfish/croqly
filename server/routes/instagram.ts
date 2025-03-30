import { Router, RequestHandler } from 'express';
import { IgApiClient } from 'instagram-private-api';
import fetch from 'node-fetch';
import * as fs from 'fs';
import OpenAI from 'openai';

const router = Router();
const ig = new IgApiClient();
const openai = new OpenAI();

const getOembed: RequestHandler = async (req, res) => {

  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const oembedUrl = `https://i.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(oembedUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
    console.log(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Instagram data' });
  }
};

interface MediaInfo {
  items: Array<{
    video_url?: string;
    video_versions?: Array<{
      url?: string;
    }>;
    carousel_media?: Array<{
      video_url?: string;
    }>;
  }>;
}

async function transcribeVideoFromUrl(videoUrl: string): Promise<string | null> {
  try {

    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }

    const buffer = await response.buffer();
    const tempPath = `/tmp/video-${Date.now()}.mp4`;
    await fs.promises.writeFile(tempPath, buffer);


    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });

    await fs.promises.unlink(tempPath);
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing video:', error);
    return null;
  }
}

const getPrivateMedia: RequestHandler = async (req, res) => {

  try {
    const { mediaId } = req.query;
    if (!mediaId || typeof mediaId !== 'string') {
      return res.status(400).json({ error: 'Media ID is required' });
    }

    ig.state.generateDevice(process.env.INSTAGRAM_USERNAME || '');
    await ig.simulate.preLoginFlow();
    await ig.account.login(
      process.env.INSTAGRAM_USERNAME || '',
      process.env.INSTAGRAM_PASSWORD || ''
    );
    const media = await ig.media.info(mediaId) as MediaInfo;
    const videoUrl = media.items[0]?.video_versions?.[0]?.url || 
                    media.items[0]?.video_url ||
                    media.items[0]?.carousel_media?.[0]?.video_url ||
                    null;

    if (!videoUrl) {
      return res.status(404).json({ error: 'No video found' });
    }

    const transcription = await transcribeVideoFromUrl(videoUrl);
    

    res.json({
      videoUrl,
      transcription
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Instagram media' });
  } finally {
    // Ensure we destroy the session
    if (ig) {
      await ig.destroy();
    }
  }
};

router.get('/oembed', getOembed);
router.get('/media', getPrivateMedia);

export default router; 