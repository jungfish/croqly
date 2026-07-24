import { describe, it, expect } from 'vitest';
import { categorizeIngredient } from './ingredientCategory.js';

describe('categorizeIngredient', () => {
  it('categorizes produce', () => {
    expect(categorizeIngredient('carotte')).toBe('Fruits et légumes');
  });

  it('categorizes meat and fish', () => {
    expect(categorizeIngredient('blanc de poulet')).toBe('Viandes et poissons');
  });

  it('categorizes dairy', () => {
    expect(categorizeIngredient('fromage râpé')).toBe('Crémerie');
  });

  it('categorizes bakery', () => {
    expect(categorizeIngredient('baguette')).toBe('Boulangerie');
  });

  it('categorizes frozen', () => {
    expect(categorizeIngredient('légumes surgelés')).toBe('Surgelés');
  });

  it('categorizes drinks', () => {
    expect(categorizeIngredient('vin blanc')).toBe('Boissons');
  });

  it('categorizes pantry staples', () => {
    expect(categorizeIngredient('farine')).toBe('Épicerie');
  });

  it('falls back to Autre for unmatched ingredients', () => {
    expect(categorizeIngredient('un truc bizarre')).toBe('Autre');
  });
});
