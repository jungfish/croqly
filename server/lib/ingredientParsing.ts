// Pure regex-based parsing — no AI call. Ingredient lines are short and follow
// a small set of French recipe conventions (leading quantity + optional unit),
// the same conventions already exploited by adjustIngredient() in
// src/pages/recipe/[id].tsx and the emoji rules in src/lib/ingredientEmoji.ts.
export interface ParsedIngredientLine {
  raw: string;
  name: string;
  quantity: number | null;
  unit: string | null;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
};

// Order matters only in that a fraction like "1/2" must not be matched as the
// plain integer "1" — every alternative is tried at the same start position.
const QUANTITY_REGEX = /^(\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔])\s*/;

// Each pattern is anchored at the start of the remaining text with a trailing
// word boundary, so e.g. "grammes" is never mistakenly cut down to "g".
const UNIT_PATTERNS: Array<{ regex: RegExp; unit: string }> = [
  { regex: /^(?:cuill(?:è|e)res?\s*à\s*soupe|c\.?\s*à\s*s\.?)\b/i, unit: 'cuillère à soupe' },
  { regex: /^(?:cuill(?:è|e)res?\s*à\s*café|c\.?\s*à\s*c\.?)\b/i, unit: 'cuillère à café' },
  { regex: /^(?:kilo(?:gramme)?s?|kg)\b/i, unit: 'kg' },
  { regex: /^(?:grammes?|g)\b/i, unit: 'g' },
  { regex: /^(?:millilitres?|ml)\b/i, unit: 'ml' },
  { regex: /^(?:centilitres?|cl)\b/i, unit: 'cl' },
  { regex: /^(?:litres?|l)\b/i, unit: 'l' },
  { regex: /^pincées?\b/i, unit: 'pincée' },
  { regex: /^gousses?\b/i, unit: 'gousse' },
  { regex: /^tranches?\b/i, unit: 'tranche' },
  { regex: /^sachets?\b/i, unit: 'sachet' },
  { regex: /^bottes?\b/i, unit: 'botte' },
  { regex: /^branches?\b/i, unit: 'branche' },
  { regex: /^tasses?\b/i, unit: 'tasse' },
  { regex: /^verres?\b/i, unit: 'verre' },
];

const CONNECTOR_REGEX = /^\s*(?:de\s+la\s+|de\s+l['’]\s*|d['’]\s*|de\s+|du\s+|des\s+)/i;
const LEADING_CONNECTOR_REGEX = /^(?:de\s+la\s+|de\s+l['’]\s*|d['’]\s*|de\s+|du\s+|des\s+)/i;

function parseQuantityToken(token: string): number {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  if (token.includes('/')) {
    const [num, den] = token.split('/').map(Number);
    return den ? num / den : num;
  }
  return parseFloat(token.replace(',', '.'));
}

export function parseIngredientLine(raw: string): ParsedIngredientLine {
  const trimmed = raw.trim();
  const quantityMatch = trimmed.match(QUANTITY_REGEX);

  if (!quantityMatch) {
    return { raw, name: trimmed, quantity: null, unit: null };
  }

  const quantity = parseQuantityToken(quantityMatch[1]);
  let rest = trimmed.slice(quantityMatch[0].length);

  const unitMatch = UNIT_PATTERNS.find(({ regex }) => regex.test(rest));
  if (unitMatch) {
    rest = rest.slice(rest.match(unitMatch.regex)![0].length).replace(CONNECTOR_REGEX, '');
    return { raw, name: rest.trim(), quantity, unit: unitMatch.unit };
  }

  // No unit word — a bare count directly followed by the ingredient noun,
  // e.g. "2 œufs", "3 tomates".
  return { raw, name: rest.trim(), quantity, unit: 'unité' };
}

// Used only as the shopping-list merge key — display text keeps the original
// casing/wording. Plural normalization is a simple trailing-"s" strip, which
// is wrong for words that are naturally singular-ending-in-s (e.g. "cassis")
// — an accepted v1 limitation over risking a wrong merge either way.
export function canonicalizeName(name: string): string {
  let cleaned = name.trim().toLowerCase().replace(LEADING_CONNECTOR_REGEX, '').trim();
  if (cleaned.length > 3 && cleaned.endsWith('s')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}
