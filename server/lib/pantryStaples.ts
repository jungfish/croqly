// Common pantry staples almost every kitchen already has — never added to a
// shopping list, however they're phrased in a recipe's ingredient line, so
// the list doesn't get cluttered with things nobody actually needs to buy.
// Deliberately short; extend here if more staples should be excluded.
const PANTRY_STAPLE_RULES: RegExp[] = [
  /\bsel\b/i,
  /poivre/i,
  /\beau\b/i,
];

export function isPantryStaple(name: string): boolean {
  return PANTRY_STAPLE_RULES.some((rule) => rule.test(name));
}
