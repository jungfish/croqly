import * as fs from 'fs';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { getOpenAI } from './openaiClient.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);

// Whisper's hard cap on upload size — sending the raw video risks exceeding
// this on longer reels even though the audio track alone never would, since
// video dominates the file size (see extractAudio below).
const WHISPER_MAX_BYTES = 26_214_400;

// Strips the video stream and re-encodes the audio as a low-bitrate mono
// mp3 — a 100s reel lands around 1-2MB this way, versus 25MB+ for the full
// video, so it stays well clear of Whisper's upload limit regardless of
// source resolution/bitrate.
function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .audioChannels(1)
      .save(audioPath)
      .on('end', () => resolve())
      .on('error', reject);
  });
}

// Downloads a video, extracts its audio track, and transcribes it. Reels are
// short (a couple of minutes at most), so whisper-1 stays the right (cheap)
// choice — no need for a pricier transcription model.
export async function transcribeVideoFromUrl(videoUrl: string): Promise<string | null> {
  const videoPath = `/tmp/video-${Date.now()}.mp4`;
  const audioPath = `/tmp/audio-${Date.now()}.mp3`;
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Failed to fetch video');

    const buffer = await response.buffer();
    await fs.promises.writeFile(videoPath, buffer);
    await extractAudio(videoPath, audioPath);

    const { size } = await fs.promises.stat(audioPath);
    if (size > WHISPER_MAX_BYTES) {
      throw new Error(`Extracted audio still too large for Whisper (${size} bytes)`);
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing video:', error);
    return null;
  } finally {
    await fs.promises.unlink(videoPath).catch(() => {});
    await fs.promises.unlink(audioPath).catch(() => {});
  }
}
