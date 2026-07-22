import { interpretRecipe, generateRecipeImage } from './aiService';
import type { Recipe } from "@/types/recipe";
import { saveRecipe } from './databaseService';
import { authFetch } from '@/lib/apiClient';

// URL flow: one server call does the cache lookup, scrape, transcription,
// interpretation, and SavedRecipe bookkeeping (step 5) — no client-side
// orchestration, unlike the photo/OCR flow below. Illustration generation is
// deliberately left out of this call (see generateIllustrationForRecipe).
export async function processRecipeFromUrl(url: string): Promise<Recipe & { cached: boolean }> {
  const response = await authFetch('/api/recipes/from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to process recipe: ${response.status}`);
  }
  return response.json();
}

// Kicks off illustration generation for a just-created recipe, out of band
// from processRecipeFromUrl so the initial import doesn't have to wait on
// the slowest AI step. Called after the user is already looking at the
// recipe page, which shows a loader over the placeholder thumbnail meanwhile.
export async function generateIllustrationForRecipe(recipeId: string): Promise<string | null> {
  const response = await authFetch(`/api/recipes/${recipeId}/illustration`, { method: 'POST' });
  if (!response.ok) return null;
  const { illustration } = await response.json();
  return illustration ?? null;
}

export async function processRecipeFromInstagram(
  caption?: string, 
  transcription?: string, 
  thumbnailUrl?: string, 
  videoUrl?: string,
  postUrl?: string
): Promise<Recipe> {
  try {
    const recipe = await interpretRecipe(caption || '', transcription || '');
    // Generate custom illustration if no thumbnail provided
    const illustration = await generateRecipeImage(recipe.title, recipe.ingredients) || thumbnailUrl;
    
    // Prepare recipe data with video URL
    const processedRecipe: Recipe = {
      title: recipe.title || 'Untitled Recipe',
      category: recipe.category || 'Plat principal',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      illustration,
      url: postUrl,
      videoUrl, // Add video URL from Instagram media endpoint
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.servings || 4, // Default to 4 servings if not specified
    };


    // Save the recipe to the database
    const savedRecipe = await saveRecipe(processedRecipe);
    
    return savedRecipe;
  } catch (error) {
    console.error('Error processing recipe:', error);
    throw error;
  }
}
