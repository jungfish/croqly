// Maps a canonicalized ingredient name to the supermarket aisle it's usually
// bought from, so the shopping list can group items the way people actually
// shop instead of listing them in add order. Order matters — more specific
// terms are checked before generic ones, same convention as
// src/lib/ingredientEmoji.ts.
export const CATEGORY_ORDER = [
  'Fruits et légumes',
  'Viandes et poissons',
  'Crémerie',
  'Boulangerie',
  'Épicerie',
  'Surgelés',
  'Boissons',
  'Autre',
] as const;

export type IngredientCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_RULES: Array<[RegExp, IngredientCategory]> = [
  [/pomme de terre|patate|\bpomme\b|carotte|avocat|citron|tomate|oignon|échalote|\bail\b|salade|courgette|poivron|champignon|banane|orange|poire|fraise|framboise|menthe|basilic|persil|coriandre|ciboulette/i, 'Fruits et légumes'],
  [/poulet|volaille|bœuf|boeuf|steak|viande hachée|porc|agneau|lardon|jambon|saucisse|poisson|saumon|thon|cabillaud|crevette/i, 'Viandes et poissons'],
  [/œuf|oeuf|beurre|lait\b|crème|fromage|parmesan|mozzarella|feta|gruy[eè]re|comt[eé]|yaourt/i, 'Crémerie'],
  [/pain\b|baguette|brioche|croissant/i, 'Boulangerie'],
  [/surgel[ée]/i, 'Surgelés'],
  [/vin\b|bière|jus\b|soda|eau\b/i, 'Boissons'],
  [/farine|\bsucre|huile|p[aâ]tes|spaghetti|tagliatelle|riz\b|chocolat|miel|sel\b|poivre|épice|levure|vinaigre|sauce/i, 'Épicerie'],
];

export function categorizeIngredient(name: string): IngredientCategory {
  const match = CATEGORY_RULES.find(([pattern]) => pattern.test(name));
  return match ? match[1] : 'Autre';
}
