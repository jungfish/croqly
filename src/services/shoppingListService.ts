import { authFetch } from '@/lib/apiClient';

export interface ShoppingListItem {
  id: string;
  name: string;
  unit: string;
  quantity: number | null;
  label: string;
  checked: boolean;
}

async function parseOrThrow(response: Response, errorMessage: string) {
  if (!response.ok) throw new Error(errorMessage);
  return response.json();
}

export async function fetchShoppingList(): Promise<ShoppingListItem[]> {
  const response = await authFetch('/api/shopping-list');
  return parseOrThrow(response, 'Failed to fetch shopping list');
}

export async function addRecipeToShoppingList(recipeId: string): Promise<ShoppingListItem[]> {
  const response = await authFetch(`/api/shopping-list/from-recipe/${recipeId}`, { method: 'POST' });
  return parseOrThrow(response, 'Failed to add recipe to shopping list');
}

export async function addRecipesToShoppingList(recipeIds: string[]): Promise<ShoppingListItem[]> {
  const response = await authFetch('/api/shopping-list/from-recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeIds }),
  });
  return parseOrThrow(response, 'Failed to add recipes to shopping list');
}

export async function toggleShoppingListItem(id: string, checked: boolean): Promise<void> {
  const response = await authFetch(`/api/shopping-list/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checked }),
  });
  if (!response.ok) throw new Error('Failed to update item');
}

export async function deleteShoppingListItem(id: string): Promise<void> {
  const response = await authFetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete item');
}

export async function clearCheckedItems(): Promise<void> {
  const response = await authFetch('/api/shopping-list/checked', { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear checked items');
}
