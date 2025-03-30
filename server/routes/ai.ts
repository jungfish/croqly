import { Router, RequestHandler } from 'express';
import { IncomingForm } from 'formidable';
import * as fs from 'fs';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const router = Router();
const openai = new OpenAI();

// Transcribe video
const transcribeVideo: RequestHandler = async (req, res) => {

  try {
    const { videoUrl } = req.query;
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('Fetching video from URL:', videoUrl);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch video' });
    }

    console.log('Video fetched successfully');

    const buffer = await response.buffer();
    const tempPath = `/tmp/video-${Date.now()}.mp4`;
    await fs.promises.writeFile(tempPath, buffer);

    console.log('Transcribing video...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
    });

    await fs.promises.unlink(tempPath);
    console.log('Transcription completed successfully', transcription.text);
    res.json({ text: transcription.text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transcribe video' });
  }
};

// Process images with OCR
const performOCR: RequestHandler = async (req, res) => {
  console.log('OCR endpoint hit');
  const form = new IncomingForm({
    multiples: true,
    keepExtensions: true,
  });
  
  try {
    console.log('Parsing form data...');
    const [_fields, files] = await form.parse(req);
    console.log('Files received:', files);
    
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    
    if (!file) {
      console.log('No image file found in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image:', file.originalFilename);
    const fileBuffer = await fs.promises.readFile(file.filepath);
    const base64Image = fileBuffer.toString('base64');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please read and extract all text from this image.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.mimetype};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    await fs.promises.unlink(file.filepath);
    console.log('OCR processing completed successfully');
    res.json({ text: completion.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('Error in OCR processing:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};

router.get('/transcribe', transcribeVideo);
router.post('/ocr', performOCR);

export default router; 