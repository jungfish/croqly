import { Router, RequestHandler } from 'express';
import { IncomingForm } from 'formidable';
import * as fs from 'fs';
import { getOpenAI } from '../lib/openaiClient.js';
import { interpretRecipe, generateIllustration } from '../lib/aiInterpretation.js';
import { logError } from '../lib/logger.js';

const router = Router();

// Used only by the photo-upload (OCR) path, which has no stable cache key —
// the URL-based flow (server/routes/recipes.ts) calls interpretRecipe /
// generateIllustration directly, in-process, behind its cache gate.
const interpretHandler: RequestHandler = async (req, res) => {
  try {
    const { caption, transcription } = req.body as { caption?: string; transcription?: string };
    res.json(await interpretRecipe(caption ?? '', transcription ?? ''));
  } catch (error) {
    logError('Error interpreting recipe', error);
    res.status(500).json({ error: 'Failed to interpret recipe' });
  }
};

const illustrateHandler: RequestHandler = async (req, res) => {
  try {
    const { title, ingredients } = req.body as { title?: string; ingredients?: string[] };
    if (!title) return res.status(400).json({ error: 'title is required' });
    const illustrationUrl = await generateIllustration(title, ingredients ?? []);
    res.json({ illustrationUrl });
  } catch (error) {
    logError('Error generating recipe illustration', error);
    res.status(500).json({ error: 'Failed to generate illustration' });
  }
};

// Process images with OCR (the "upload a photo of a recipe" fallback path).
// Uses the same cheap text/vision tier as interpretRecipe, never gpt-image-2
// — that model generates/edits images, it doesn't read them.
const performOCR: RequestHandler = async (req, res) => {
  const form = new IncomingForm({ multiples: true, keepExtensions: true });

  try {
    const [, files] = await form.parse(req);
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) return res.status(400).json({ error: 'No image file provided' });

    const fileBuffer = await fs.promises.readFile(file.filepath);
    const base64Image = fileBuffer.toString('base64');

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-5.6-luna',
      max_completion_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please read and extract all text from this image.' },
            { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64Image}` } },
          ],
        },
      ],
    });

    await fs.promises.unlink(file.filepath);
    res.json({ text: completion.choices[0]?.message?.content || '' });
  } catch (error) {
    logError('Error in OCR processing', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};

router.post('/interpret', interpretHandler);
router.post('/illustrate', illustrateHandler);
router.post('/ocr', performOCR);

export default router;
