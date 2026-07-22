// Plain arithmetic — no AI involved. Converts a parsed quantity/unit pair to
// a common base unit so quantities can be summed correctly (e.g. "200 g" +
// "1 kg" -> 1200 g), and formats the merged result back into display text.
const MASS_UNITS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME_UNITS: Record<string, number> = { ml: 1, cl: 10, l: 1000 };

export function toBaseUnit(quantity: number | null, unit: string | null): { quantity: number | null; unit: string } {
  const normalizedUnit = (unit ?? '').trim().toLowerCase();

  if (normalizedUnit in MASS_UNITS) {
    return { quantity: quantity == null ? null : quantity * MASS_UNITS[normalizedUnit], unit: 'g' };
  }
  if (normalizedUnit in VOLUME_UNITS) {
    return { quantity: quantity == null ? null : quantity * VOLUME_UNITS[normalizedUnit], unit: 'ml' };
  }
  return { quantity, unit: normalizedUnit };
}

function startsWithVowelSound(word: string): boolean {
  return /^[aàâeéèêiîïoôuûhy]/i.test(word);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatQuantity(quantity: number): string {
  return quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1).replace('.0', '').replace('.', ',');
}

// The stored ingredient name is the singular merge key (see canonicalizeName
// in ingredientParsing.ts) — pluralize it back for display when the quantity
// calls for it, following the standard French rule of plural at >1.
function pluralize(word: string, quantity: number): string {
  if (quantity <= 1 || /[sx]$/i.test(word)) return word;
  return `${word}s`;
}

const PLURALIZABLE_UNITS = new Set([
  'cuillère à soupe', 'cuillère à café', 'pincée', 'gousse', 'tranche', 'sachet', 'botte', 'branche', 'tasse', 'verre',
]);

function pluralizeUnit(unit: string, quantity: number): string {
  return PLURALIZABLE_UNITS.has(unit) ? pluralize(unit, quantity) : unit;
}

export function formatLabel(name: string, quantity: number | null, unit: string): string {
  if (quantity == null) return capitalize(name);
  if (unit === 'g' && quantity >= 1000) return formatLabel(name, quantity / 1000, 'kg');
  if (unit === 'ml' && quantity >= 1000) return formatLabel(name, quantity / 1000, 'l');
  // "unité" is an implicit count (e.g. "2 œufs") — no unit word in French.
  if (unit === 'unité') return `${formatQuantity(quantity)} ${pluralize(name, quantity)}`;

  const connector = startsWithVowelSound(name) ? "d'" : 'de ';
  const unitLabel = unit === 'l' ? 'L' : pluralizeUnit(unit, quantity);
  return `${formatQuantity(quantity)} ${unitLabel} ${connector}${name}`;
}
