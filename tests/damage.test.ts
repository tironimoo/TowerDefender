import { describe, expect, it } from 'vitest';
import { resistanceFactor } from '@sim/index';

describe('Schadensrechnung', () => {
  it('bildet die Widerstandstabelle aus dem Konzept ab', () => {
    expect(resistanceFactor('leder', 'physisch', 0)).toBeCloseTo(1.0);
    expect(resistanceFactor('eisen', 'physisch', 0)).toBeCloseTo(0.4);
    expect(resistanceFactor('obsidian', 'feuer', 0)).toBeCloseTo(0.2);
    expect(resistanceFactor('eisen', 'arkan', 0)).toBeCloseTo(1.1);
  });

  it('hebt mit Durchschlag einen Teil des Widerstands auf', () => {
    // Eisen laesst vierzig Prozent durch, halber Durchschlag ergibt siebzig.
    expect(resistanceFactor('eisen', 'physisch', 0.5)).toBeCloseTo(0.7);
    expect(resistanceFactor('eisen', 'physisch', 1)).toBeCloseTo(1.0);
  });

  it('laesst vollstaendige Immunitaet immun bleiben', () => {
    // Sonst waere die Regel gebrochen, dass nur arkan die Leerlande trifft.
    expect(resistanceFactor('aetherisch', 'physisch', 1)).toBe(0);
    expect(resistanceFactor('aetherisch', 'feuer', 1)).toBe(0);
    expect(resistanceFactor('aetherisch', 'arkan', 0)).toBeCloseTo(1.0);
  });

  it('erhoeht einen Schwaechewert nicht durch Durchschlag', () => {
    expect(resistanceFactor('eisen', 'arkan', 1)).toBeCloseTo(1.1);
  });
});
