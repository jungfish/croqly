import { authFetch } from '@/lib/apiClient';

export interface ShoppingListItem {
  id: string;
  name: string;
  unit: string;
  quantity: number | null;
  label: string;
  category: string;
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

export async function addManualItemToShoppingList(text: string): Promise<ShoppingListItem[]> {
  const response = await authFetch('/api/shopping-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return parseOrThrow(response, "Failed to add item");
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

export async function clearAllItems(): Promise<void> {
  const response = await authFetch('/api/shopping-list', { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear shopping list');
}

export type ShoppingListSharePerson = { userId: string; email: string | null };

export type ShoppingListShareStatus = {
  // Who the current user has shared their own list with, if anyone.
  sharedWith: ShoppingListSharePerson | null;
  // Whose list the current user is working off of instead of their own,
  // because that person shared it with them.
  viewingSharedFrom: ShoppingListSharePerson | null;
};

export async function fetchShoppingListShareStatus(): Promise<ShoppingListShareStatus> {
  const response = await authFetch('/api/shopping-list/share');
  return parseOrThrow(response, 'Failed to fetch share status');
}

export async function shareShoppingListWith(userId: string): Promise<void> {
  const response = await authFetch('/api/shopping-list/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to share shopping list');
  }
}

export async function unshareShoppingList(): Promise<void> {
  const response = await authFetch('/api/shopping-list/share', { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to unshare shopping list');
}
