// Display order + icon for the aisles assigned server-side in
// server/lib/ingredientCategory.ts. Kept in sync with CATEGORY_ORDER there —
// duplicated rather than imported since the frontend only needs the order
// items are grouped in, not the regex rules that assign the category.
export const CATEGORY_DISPLAY_ORDER = [
  'Fruits et légumes',
  'Viandes et poissons',
  'Crémerie',
  'Boulangerie',
  'Épicerie',
  'Surgelés',
  'Boissons',
  'Autre',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  'Fruits et légumes': '🥕',
  'Viandes et poissons': '🥩',
  'Crémerie': '🧀',
  'Boulangerie': '🍞',
  'Épicerie': '🥫',
  'Surgelés': '❄️',
  'Boissons': '🥤',
  Autre: '🛒',
};

export function iconForCategory(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Autre;
}

export function sortByCategory<T extends { category: string }>(items: T[]): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) list.push(item);
    else groups.set(item.category, [item]);
  }
  return CATEGORY_DISPLAY_ORDER.filter((category) => groups.has(category)).map((category) => [
    category,
    groups.get(category)!,
  ]);
}
