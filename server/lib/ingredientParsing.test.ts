import { describe, it, expect } from 'vitest';
import { parseIngredientLine, canonicalizeName } from './ingredientParsing.js';

describe('parseIngredientLine', () => {
  it('parses a quantity + metric unit + name', () => {
    expect(parseIngredientLine('200 g de farine')).toEqual({
      raw: '200 g de farine',
      name: 'farine',
      quantity: 200,
      unit: 'g',
    });
  });

  it('parses a bare count with no unit as "unité"', () => {
    expect(parseIngredientLine('2 œufs')).toEqual({
      raw: '2 œufs',
      name: 'œufs',
      quantity: 2,
      unit: 'unité',
    });
  });

  it('parses a unicode fraction', () => {
    expect(parseIngredientLine('½ citron')).toEqual({
      raw: '½ citron',
      name: 'citron',
      quantity: 0.5,
      unit: 'unité',
    });
  });

  it('parses a written fraction identically to the unicode form', () => {
    expect(parseIngredientLine('1/2 citron')).toEqual({
      raw: '1/2 citron',
      name: 'citron',
      quantity: 0.5,
      unit: 'unité',
    });
  });

  it('parses a spelled-out spoon unit', () => {
    expect(parseIngredientLine('1 cuillère à soupe de miel')).toEqual({
      raw: '1 cuillère à soupe de miel',
      name: 'miel',
      quantity: 1,
      unit: 'cuillère à soupe',
    });
  });

  it('returns no quantity/unit when the line has no leading number', () => {
    expect(parseIngredientLine('Sel')).toEqual({
      raw: 'Sel',
      name: 'Sel',
      quantity: null,
      unit: null,
    });
  });
});

describe('canonicalizeName', () => {
  it('lowercases and strips a simple trailing plural', () => {
    expect(canonicalizeName('Tomates')).toBe('tomate');
  });

  it('strips a leading French connector', () => {
    expect(canonicalizeName('de la farine')).toBe('farine');
  });

  it('leaves short words alone even if they end in s', () => {
    expect(canonicalizeName('riz')).toBe('riz');
  });
});
