import { describe, it, expect } from 'vitest';
import { emojiForIngredient } from './ingredientEmoji.js';

describe('emojiForIngredient', () => {
  it('matches a known ingredient', () => {
    expect(emojiForIngredient('œufs')).toBe('🥚');
  });

  it('is case-insensitive', () => {
    expect(emojiForIngredient('POULET')).toBe('🍗');
  });

  it('matches on substring within a fuller ingredient line', () => {
    expect(emojiForIngredient('huile d\'olive')).toBe('🫒');
  });

  it('falls back to the default emoji for an unmatched ingredient', () => {
    expect(emojiForIngredient('quinoa')).toBe('🥣');
  });
});
