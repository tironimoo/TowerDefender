import { describe, expect, it } from 'vitest';
import { createRng } from '@sim/index';

describe('Zufallsgenerator', () => {
  it('liefert bei gleichem Ausgangswert dieselbe Folge', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const folgeA = Array.from({ length: 50 }, () => a.next());
    const folgeB = Array.from({ length: 50 }, () => b.next());
    expect(folgeA).toEqual(folgeB);
  });

  it('liefert bei anderem Ausgangswert eine andere Folge', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('bleibt im Bereich null bis eins', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('haelt die Grenzen von int ein', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(8);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
