import { describe, it, expect } from 'vitest';
import { iconForCategory, sortByCategory } from './shoppingListCategories.js';

describe('iconForCategory', () => {
  it('returns the icon for a known category', () => {
    expect(iconForCategory('Crémerie')).toBe('🧀');
  });

  it('falls back to the Autre icon for an unknown category', () => {
    expect(iconForCategory('Inconnu')).toBe('🛒');
  });
});

describe('sortByCategory', () => {
  it('groups items by category and orders groups by CATEGORY_DISPLAY_ORDER', () => {
    const items = [
      { category: 'Épicerie', name: 'farine' },
      { category: 'Fruits et légumes', name: 'carotte' },
      { category: 'Épicerie', name: 'sucre' },
    ];

    expect(sortByCategory(items)).toEqual([
      ['Fruits et légumes', [{ category: 'Fruits et légumes', name: 'carotte' }]],
      ['Épicerie', [{ category: 'Épicerie', name: 'farine' }, { category: 'Épicerie', name: 'sucre' }]],
    ]);
  });

  it('omits categories with no items', () => {
    const items = [{ category: 'Boissons', name: 'jus' }];
    expect(sortByCategory(items)).toEqual([['Boissons', [{ category: 'Boissons', name: 'jus' }]]]);
  });
});
