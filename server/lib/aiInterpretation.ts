import { getOpenAI } from './openaiClient.js';
import { uploadIllustration, IllustrationUrls } from './storage.js';

// Cheapest capable tier — extracting a recipe from a short caption/
// transcription is a pattern-extraction task, not a reasoning-heavy one.
// Escalate to a bigger GPT-5.6 tier only if real testing shows this failing.
const TEXT_MODEL = 'gpt-5.6-luna';

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    category: {
      type: 'string',
      enum: ['Dessert', 'Soupe', 'Plat principal', 'Entrée', 'Bébé'],
    },
    ingredients: { type: 'array', items: { type: 'string' } },
    instructions: { type: 'array', items: { type: 'string' } },
    // Nullable — these end up in public schema.org Recipe markup, so a
    // guessed-but-wrong duration is worse than an honestly-missing one.
    // See the system prompt below: the model is told to return null rather
    // than invent a plausible-sounding time.
    prepTime: { type: ['string', 'null'] },
    cookTime: { type: ['string', 'null'] },
    totalTime: { type: ['string', 'null'] },
    servings: { type: 'integer', minimum: 1, maximum: 10 },
  },
  required: [
    'title', 'category', 'ingredients', 'instructions',
    'prepTime', 'cookTime', 'totalTime', 'servings',
  ],
  additionalProperties: false,
};

export interface InterpretedRecipe {
  title: string;
  category: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  servings: number;
}

// Caption + transcription -> structured recipe JSON. The instructions are a
// fixed prefix and the variable content comes last, so OpenAI's automatic
// prompt caching applies across calls.
export async function interpretRecipe(caption: string, transcription: string): Promise<InterpretedRecipe> {
  const completion = await getOpenAI().chat.completions.create({
    model: TEXT_MODEL,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'recipe', schema: RECIPE_SCHEMA, strict: true },
    },
    messages: [
      {
        role: 'system',
        content:
          'Analyze an Instagram recipe caption and transcription and extract a structured recipe from it. ' +
          'Respond only in French. If servings is unspecified, default to 4. ' +
          'For prepTime, cookTime and totalTime: only fill them in if a duration is stated or clearly ' +
          'implied by the source — never invent a plausible-sounding duration. Return null for any of ' +
          'the three that aren\'t genuinely supported by the caption or transcription.',
      },
      {
        role: 'user',
        content: `Caption: "${caption}"\nTranscription: "${transcription}"`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from model');
  return JSON.parse(content);
}

// Illustration generation only — gpt-image-2 is never used to read/interpret
// images, only to generate them.
export async function generateIllustration(title: string, ingredients: string[]): Promise<IllustrationUrls> {
  const prompt = `A bold, minimalist illustration of ${title}, in a warm and playful style inspired by modern recipe cards — clean shapes and confident brushstrokes rather than photorealistic detail. The main ingredients are the following: ${ingredients.slice(0, 8).join(', ')}. They are arranged appetizingly in a bowl or on a plate, with steam subtly rising. Color palette: a warm cream background (like parchment paper), with vivid, appetizing accents on the food itself — tomato red, fresh basil green, and egg-yolk yellow. Bright, even lighting, no harsh shadows. Clean and modern aesthetic. No text included. Composition should be wide and horizontal to fit as a banner image.`;

  const response = await getOpenAI().images.generate({
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: '1536x1024',
    quality: 'medium', // not "high" — a stylized illustration doesn't need it, ~3-5x cheaper
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');

  return uploadIllustration(b64, `${Date.now()}-${title.slice(0, 40)}.png`);
}
