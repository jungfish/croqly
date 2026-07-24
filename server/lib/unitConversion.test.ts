import { describe, it, expect } from 'vitest';
import { toBaseUnit, formatLabel } from './unitConversion.js';

describe('toBaseUnit', () => {
  it('converts kg to g', () => {
    expect(toBaseUnit(1, 'kg')).toEqual({ quantity: 1000, unit: 'g' });
  });

  it('converts cl to ml', () => {
    expect(toBaseUnit(5, 'cl')).toEqual({ quantity: 50, unit: 'ml' });
  });

  it('leaves g/ml as-is', () => {
    expect(toBaseUnit(200, 'g')).toEqual({ quantity: 200, unit: 'g' });
  });

  it('passes through unrecognized units unchanged', () => {
    expect(toBaseUnit(2, 'pincée')).toEqual({ quantity: 2, unit: 'pincée' });
  });

  it('handles a null quantity', () => {
    expect(toBaseUnit(null, 'kg')).toEqual({ quantity: null, unit: 'g' });
  });

  it('normalizes unit casing/whitespace', () => {
    expect(toBaseUnit(1, ' KG ')).toEqual({ quantity: 1000, unit: 'g' });
  });
});

describe('formatLabel', () => {
  it('capitalizes a name with no quantity', () => {
    expect(formatLabel('farine', null, '')).toBe('Farine');
  });

  it('formats grams with a consonant-leading name', () => {
    expect(formatLabel('sucre', 200, 'g')).toBe('200 g de sucre');
  });

  it("uses the d' elision before a vowel sound", () => {
    expect(formatLabel('ail', 2, 'g')).toBe("2 g d'ail");
  });

  it('promotes grams to kg above 1000', () => {
    expect(formatLabel('farine', 1500, 'g')).toBe('1,5 kg de farine');
  });

  it('promotes ml to L above 1000', () => {
    expect(formatLabel('lait', 1000, 'ml')).toBe('1 L de lait');
  });

  it('treats "unité" as an implicit count with pluralization', () => {
    expect(formatLabel('œuf', 3, 'unité')).toBe('3 œufs');
    expect(formatLabel('œuf', 1, 'unité')).toBe('1 œuf');
  });

  it('pluralizes a pluralizable unit above 1 (naive trailing-s append)', () => {
    expect(formatLabel('farine', 2, 'cuillère à soupe')).toBe('2 cuillère à soupes de farine');
  });

  it('does not pluralize a non-pluralizable unit', () => {
    expect(formatLabel('lait', 2, 'l')).toBe('2 L de lait');
  });
});
