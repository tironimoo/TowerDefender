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

  it('macht aetherische Gegner sehr widerstandsfaehig, aber nicht unverwundbar', () => {
    // Frueher stand hier null. Das war keine Schwierigkeit, sondern eine
    // Sperre: der schreiter kommt in den Leerlanden ab Welle eins, und ein
    // Loadout ohne Arkanturm richtete dort rechnerisch keinen Schaden an -
    // die Karte war damit nicht schwer, sondern unmoeglich.
    expect(resistanceFactor('aetherisch', 'physisch', 0)).toBeCloseTo(0.25);
    expect(resistanceFactor('aetherisch', 'feuer', 0)).toBeCloseTo(0.25);
    // Arkan bleibt deutlich die richtige Antwort: viermal so viel Schaden.
    expect(resistanceFactor('aetherisch', 'arkan', 0)).toBeCloseTo(1.0);
    expect(resistanceFactor('aetherisch', 'arkan', 0)).toBeGreaterThan(
      resistanceFactor('aetherisch', 'physisch', 0) * 3,
    );
  });

  it('erhoeht einen Schwaechewert nicht durch Durchschlag', () => {
    expect(resistanceFactor('eisen', 'arkan', 1)).toBeCloseTo(1.1);
  });
});
