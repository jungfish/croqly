import type { Recipe as RecipeType } from '@/types/recipe';

export async function saveRecipe(recipe: RecipeType) {
  try {
    console.log('Saving recipe with data:', recipe);
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });

    if (!response.ok) {
      throw new Error(`Failed to save recipe: ${response.statusText}`);
    }

    const savedRecipe = await response.json();
    console.log('Saved recipe response:', savedRecipe);
    return {
      ...savedRecipe,
      ingredients: Array.isArray(savedRecipe.ingredients) 
        ? savedRecipe.ingredients 
        : JSON.parse(savedRecipe.ingredients || '[]'),
      instructions: Array.isArray(savedRecipe.instructions) 
        ? savedRecipe.instructions 
        : JSON.parse(savedRecipe.instructions || '[]'),
    };
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
}

export async function getAllRecipes() {
  try {
    const response = await fetch('/api/db');
    if (!response.ok) {
      throw new Error(`Failed to fetch recipes: ${response.statusText}`);
    }
    
    const recipes: Array<Record<string, unknown>> = await response.json();
    return recipes.map((recipe) => ({
      ...recipe,
      ingredients: typeof recipe.ingredients === 'string' 
        ? JSON.parse(recipe.ingredients || '[]')
        : recipe.ingredients || [],
      instructions: typeof recipe.instructions === 'string'
        ? JSON.parse(recipe.instructions || '[]')
        : recipe.instructions || [],
    }));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
}

export async function getRecipeById(id: string) {
  try {
    console.log('Fetching recipe with ID:', id);
    const response = await fetch(`/api/db/${id}`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.statusText}`);
    }

    const recipe = await response.json();
    console.log('Raw recipe data:', recipe);
    
    if (!recipe || recipe.error) {
      console.log('No recipe found or error:', recipe);
      return null;
    }
    
    // Safely parse JSON strings
    const parsedRecipe = {
      ...recipe,
      ingredients: parseJSONSafely(recipe.ingredients, []),
      instructions: parseJSONSafely(recipe.instructions, []),
      servings: Number(recipe.servings) || 4  // Ensure servings is a number
    };

    console.log('Parsed recipe:', parsedRecipe);
    return parsedRecipe;
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }
}

// Helper function to safely parse JSON
function parseJSONSafely(value: unknown, defaultValue: unknown[] = []) {
  if (Array.isArray(value)) return value;
  if (!value) return defaultValue;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return defaultValue;
  }
} 