// All AI calls happen server-side — this just talks to our own /api/ai/*
// endpoints. No provider API keys ever live in browser code.
import type { Recipe } from '@/types/recipe';

type InterpretedRecipe = Pick<
  Recipe,
  'title' | 'category' | 'ingredients' | 'instructions' | 'prepTime' | 'cookTime' | 'totalTime' | 'servings'
>;

export async function interpretRecipe(caption: string, transcription: string): Promise<InterpretedRecipe> {
  const response = await fetch('/api/ai/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption, transcription }),
  });
  if (!response.ok) throw new Error('Failed to interpret recipe');
  return response.json();
}

export async function generateRecipeImage(title: string, ingredients: string[]): Promise<string> {
  try {
    const response = await fetch('/api/ai/illustrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ingredients }),
    });
    if (!response.ok) throw new Error('Failed to generate illustration');
    const { illustrationUrl } = await response.json();
    return illustrationUrl;
  } catch (error) {
    console.error('Error generating recipe image:', error);
    return `https://source.unsplash.com/featured/?${encodeURIComponent(title)},food`;
  }
}
