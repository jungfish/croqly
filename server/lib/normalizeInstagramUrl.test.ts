import { describe, it, expect } from 'vitest';
import { normalizeInstagramUrl } from './normalizeInstagramUrl.js';

describe('normalizeInstagramUrl', () => {
  it('normalizes a reel URL, stripping trailing slash', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/reel/ABC123/')).toBe(
      'https://www.instagram.com/reel/ABC123'
    );
  });

  it('normalizes a /p/ post URL to the /reel/ form', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/p/XYZ789/?utm_source=ig')).toBe(
      'https://www.instagram.com/reel/XYZ789'
    );
  });

  it('throws for a non-post/reel Instagram URL', () => {
    expect(() => normalizeInstagramUrl('https://www.instagram.com/someaccount/')).toThrow(
      'Not a valid Instagram post/reel URL'
    );
  });
});
