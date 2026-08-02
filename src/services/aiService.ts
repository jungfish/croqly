// All AI calls happen server-side — this just talks to our own /api/ai/*
// endpoints. No provider API keys ever live in browser code.
import type { Recipe } from '@/types/recipe';
import { authFetch } from '@/lib/apiClient';

type InterpretedRecipe = Pick<
  Recipe,
  'title' | 'category' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'totalTime' | 'servings'
>;

// These endpoints require auth (photo-import path only — see
// server/routes/ai.ts) so every import is traceable to an account.
export async function interpretRecipe(caption: string, transcription: string): Promise<InterpretedRecipe> {
  const response = await authFetch('/api/ai/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption, transcription }),
  });
  if (!response.ok) throw new Error('Failed to interpret recipe');
  return response.json();
}

export async function generateRecipeImage(
  title: string,
  ingredients: string[]
): Promise<{ illustration: string; illustrationThumb: string }> {
  try {
    const response = await authFetch('/api/ai/illustrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ingredients }),
    });
    if (!response.ok) throw new Error('Failed to generate illustration');
    const { illustration, illustrationThumb } = await response.json();
    return { illustration, illustrationThumb };
  } catch (error) {
    console.error('Error generating recipe image:', error);
    const fallback = `https://source.unsplash.com/featured/?${encodeURIComponent(title)},food`;
    return { illustration: fallback, illustrationThumb: fallback };
  }
}
