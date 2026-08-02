import { Router, RequestHandler } from 'express';
import { IncomingForm } from 'formidable';
import * as fs from 'fs';
import { getOpenAI } from '../lib/openaiClient.js';
import { interpretRecipe, generateIllustration } from '../lib/aiInterpretation.js';
import { logError } from '../lib/logger.js';
import { logAiUsage } from '../lib/aiUsageLog.js';
import { requireAuth } from '../middleware/supabaseAuth.js';

const router = Router();

// Used only by the photo-upload (OCR) path, which has no stable cache key —
// the URL-based flow (server/routes/recipes.ts) calls interpretRecipe /
// generateIllustration directly, in-process, behind its cache gate.
const interpretHandler: RequestHandler = async (req, res) => {
  try {
    const { caption, transcription } = req.body as { caption?: string; transcription?: string };
    res.json(await interpretRecipe(caption ?? '', transcription ?? '', req.user?.id));
  } catch (error) {
    logError('Error interpreting recipe', error);
    res.status(500).json({ error: 'Failed to interpret recipe' });
  }
};

const illustrateHandler: RequestHandler = async (req, res) => {
  try {
    const { title, ingredients } = req.body as { title?: string; ingredients?: string[] };
    if (!title) return res.status(400).json({ error: 'title is required' });
    const { full, thumb } = await generateIllustration(title, ingredients ?? [], req.user?.id);
    res.json({ illustration: full, illustrationThumb: thumb });
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
    const uploaded = files.image ? (Array.isArray(files.image) ? files.image : [files.image]) : [];
    if (!uploaded.length) return res.status(400).json({ error: 'No image file provided' });

    const imageParts = await Promise.all(
      uploaded.map(async (file) => {
        const fileBuffer = await fs.promises.readFile(file.filepath);
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${file.mimetype};base64,${fileBuffer.toString('base64')}` },
        };
      })
    );

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-5.6-luna',
      // Generous headroom: a dense cookbook page (title, times, two ingredient
      // lists, several numbered steps) plus any reasoning tokens the model
      // spends before answering can otherwise exhaust a tight cap, leaving an
      // empty/truncated transcription that silently produces a hallucinated
      // generic recipe downstream.
      max_completion_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please read and extract all text from this image (or images, if there are several pages of the same recipe).' },
            ...imageParts,
          ],
        },
      ],
    });

    await Promise.all(uploaded.map((file) => fs.promises.unlink(file.filepath)));

    await logAiUsage({
      action: 'recipe_ocr',
      model: 'gpt-5.6-luna',
      userId: req.user?.id,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    });

    res.json({ text: completion.choices[0]?.message?.content || '' });
  } catch (error) {
    logError('Error in OCR processing', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};

// All three are exclusively used by the photo-upload (OCR) path (see
// comments above) — requiring auth here means every recipe imported from a
// photo is always traceable to an account (see Recipe.createdByUserId in
// server/routes/db.ts), never an anonymous upload.
router.post('/interpret', requireAuth, interpretHandler);
router.post('/illustrate', requireAuth, illustrateHandler);
router.post('/ocr', requireAuth, performOCR);

export default router;
