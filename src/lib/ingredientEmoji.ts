// Purely cosmetic (UI only) — never applied to text sent to schema.org
// recipeIngredient, which must stay plain text. Order matters: more specific
// terms are checked before generic ones (e.g. "poudre d'amande" would never
// come up, but "huile d'olive" should still win over a bare "olive" rule).
const EMOJI_RULES: Array<[RegExp, string]> = [
  [/œuf|oeuf/i, '🥚'],
  [/farine|levure/i, '🌾'],
  [/beurre/i, '🧈'],
  [/\bsucre/i, '🍬'],
  [/lait\b|crème|yaourt/i, '🥛'],
  [/fromage|parmesan|mozzarella|feta|gruy[eè]re|comt[eé]|burrata/i, '🧀'],
  [/tomate/i, '🍅'],
  [/citron/i, '🍋'],
  [/\bail\b/i, '🧄'],
  [/oignon|échalote/i, '🧅'],
  [/huile/i, '🫒'],
  [/poulet|volaille/i, '🍗'],
  [/bœuf|boeuf|steak|viande hachée/i, '🥩'],
  [/agneau/i, '🐑'],
  [/porc\b|lardon|jambon|mortadelle/i, '🥓'],
  [/saucisse/i, '🌭'],
  [/poisson|saumon|thon|cabillaud/i, '🐟'],
  [/crevette/i, '🍤'],
  [/p[aâ]tes|spaghetti|tagliatelle/i, '🍝'],
  [/riz\b/i, '🍚'],
  [/chocolat/i, '🍫'],
  [/menthe|basilic|persil|coriandre|ciboulette/i, '🌿'],
  [/sel\b|poivre|épice/i, '🧂'],
  [/pomme de terre|patate/i, '🥔'],
  [/\bpomme\b/i, '🍎'],
  [/carotte/i, '🥕'],
  [/avocat/i, '🥑'],
  [/courgette/i, '🥒'],
  [/poivron/i, '🫑'],
  [/champignon/i, '🍄'],
  [/salade/i, '🥬'],
  [/banane/i, '🍌'],
  [/orange/i, '🍊'],
  [/poire/i, '🍐'],
  [/fraise/i, '🍓'],
  [/framboise/i, '🫐'],
  [/miel/i, '🍯'],
  [/croissant/i, '🥐'],
  [/pain\b|baguette|brioche/i, '🍞'],
  [/vinaigre|sauce/i, '🥫'],
  [/vin\b/i, '🍷'],
  [/bière/i, '🍺'],
  [/jus\b|soda/i, '🥤'],
  [/eau\b/i, '💧'],
  [/surgel[ée]/i, '🧊'],
];

const FALLBACK_EMOJI = '🥣';

export function emojiForIngredient(ingredient: string): string {
  const match = EMOJI_RULES.find(([pattern]) => pattern.test(ingredient));
  return match ? match[1] : FALLBACK_EMOJI;
}
