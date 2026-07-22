const STORAGE_KEY = 'croqly_anon_recipe_ids';
const MAX_TRACKED = 10;

// Recipes an anonymous visitor has created in this browser, tracked so they
// can all be attached to their account in one shot once they sign up —
// otherwise only the single recipe that triggered the signup redirect (via
// "Save" or the daily-limit wall) would ever get linked, and the rest stay
// orphaned in the database.
export function recordAnonRecipeView(id: string): void {
  const ids = getAnonRecipeIds();
  if (ids.includes(id)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id].slice(-MAX_TRACKED)));
}

export function getAnonRecipeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAnonRecipeIds(): void {
  localStorage.removeItem(STORAGE_KEY);
}
