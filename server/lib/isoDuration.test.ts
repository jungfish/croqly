import { describe, it, expect } from 'vitest';
import { toIsoDuration } from './isoDuration.js';

describe('toIsoDuration', () => {
  it('returns null for missing input', () => {
    expect(toIsoDuration(null)).toBeNull();
    expect(toIsoDuration(undefined)).toBeNull();
    expect(toIsoDuration('')).toBeNull();
  });

  it('passes an already-ISO duration through uppercased', () => {
    expect(toIsoDuration('pt15m')).toBe('PT15M');
  });

  it('parses standalone minutes', () => {
    expect(toIsoDuration('20 min')).toBe('PT20M');
    expect(toIsoDuration('15 minutes')).toBe('PT15M');
  });

  it('parses glued hours + minutes', () => {
    expect(toIsoDuration('1h30')).toBe('PT1H30M');
  });

  it('parses spelled-out hours + minutes', () => {
    expect(toIsoDuration('1 heure 30')).toBe('PT1H30M');
  });

  it('parses hours with no minutes', () => {
    expect(toIsoDuration('2h')).toBe('PT2H');
  });

  it('returns null for unparseable free text', () => {
    expect(toIsoDuration('Non précisé')).toBeNull();
  });
});
