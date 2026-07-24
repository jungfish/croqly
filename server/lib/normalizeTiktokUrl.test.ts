import { describe, it, expect } from 'vitest';
import { normalizeTiktokUrl } from './normalizeTiktokUrl.js';

describe('normalizeTiktokUrl', () => {
  it('normalizes a full-form video URL, stripping query params', () => {
    expect(normalizeTiktokUrl('https://www.tiktok.com/@someuser/video/1234567890123456789?lang=en')).toBe(
      'https://www.tiktok.com/@someuser/video/1234567890123456789'
    );
  });

  it('keeps a short share link as-is (can\'t resolve without following the redirect)', () => {
    expect(normalizeTiktokUrl('https://vm.tiktok.com/ZMabcdef/')).toBe('https://vm.tiktok.com/ZMabcdef/');
  });

  it('throws for a URL that is neither a full video URL nor a share link', () => {
    expect(() => normalizeTiktokUrl('https://www.tiktok.com/foo')).toThrow('Not a valid TikTok video URL');
  });
});
