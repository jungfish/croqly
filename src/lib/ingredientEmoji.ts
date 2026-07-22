// Purely cosmetic (UI only) — never applied to text sent to schema.org
// recipeIngredient, which must stay plain text. Order matters: more specific
// terms are checked before generic ones (e.g. "poudre d'amande" would never
// come up, but "huile d'olive" should still win over a bare "olive" rule).
const EMOJI_RULES: Array<[RegExp, string]> = [
  [/œuf|oeuf/i, '🥚'],
  [/farine/i, '🌾'],
  [/beurre/i, '🧈'],
  [/\bsucre/i, '🍬'],
  [/lait\b|crème/i, '🥛'],
  [/fromage|parmesan|mozzarella|feta|gruy[eè]re|comt[eé]/i, '🧀'],
  [/tomate/i, '🍅'],
  [/citron/i, '🍋'],
  [/\bail\b/i, '🧄'],
  [/oignon|échalote/i, '🧅'],
  [/huile/i, '🫒'],
  [/poulet|volaille/i, '🍗'],
  [/bœuf|boeuf|steak|viande hachée/i, '🥩'],
  [/poisson|saumon|thon|cabillaud/i, '🐟'],
  [/crevette/i, '🍤'],
  [/p[aâ]tes|spaghetti|tagliatelle/i, '🍝'],
  [/riz\b/i, '🍚'],
  [/chocolat/i, '🍫'],
  [/menthe|basilic|persil|coriandre|ciboulette/i, '🌿'],
  [/sel\b|poivre/i, '🧂'],
  [/pomme de terre|patate/i, '🥔'],
  [/\bpomme\b/i, '🍎'],
  [/carotte/i, '🥕'],
  [/avocat/i, '🥑'],
  [/miel/i, '🍯'],
  [/pain\b|baguette/i, '🍞'],
  [/vin\b/i, '🍷'],
  [/eau\b/i, '💧'],
];

const FALLBACK_EMOJI = '🥣';

export function emojiForIngredient(ingredient: string): string {
  const match = EMOJI_RULES.find(([pattern]) => pattern.test(ingredient));
  return match ? match[1] : FALLBACK_EMOJI;
}
