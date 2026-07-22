import * as fs from 'fs';
import fetch from 'node-fetch';
import { getOpenAI } from './openaiClient.js';

// Downloads a video and transcribes its audio track. Reels are short (a
// couple of minutes at most), so whisper-1 stays the right (cheap) choice —
// no need for a pricier transcription model.
export async function transcribeVideoFromUrl(videoUrl: string): Promise<string | null> {
  const tempPath = `/tmp/video-${Date.now()}.mp4`;
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Failed to fetch video');

    const buffer = await response.buffer();
    await fs.promises.writeFile(tempPath, buffer);

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing video:', error);
    return null;
  } finally {
    await fs.promises.unlink(tempPath).catch(() => {});
  }
}
