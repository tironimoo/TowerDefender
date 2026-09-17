/**
 * Balancing-Pruefungen.
 *
 * Diese Tests rechnen ganze Level ohne Grafik durch. Sie sind der Schutz davor,
 * dass eine Aenderung an Zahlen ein Level unspielbar macht, ohne dass es jemand
 * merkt. Die vollstaendige Liste der geplanten Pruefungen steht in
 * docs/05-startwerte.md. Die uebrigen brauchen mehr Level und mehr Tuerme und
 * kommen in Abschnitt 7.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import { damageShare, simulate } from '../tools/sim-runner/simulate';

const content = loadContent();

function lauf(loadout: string[], difficulty: 'normal' | 'hart' | 'albtraum' = 'normal') {
  return simulate({ content, levelId: 'level-01', difficulty, loadout, seed: 1 });
}

describe('Level 1', () => {
  it('ist mit Armbrustturm und Schleuder allein zu gewinnen', () => {
    // Pruefung 1 aus docs/05-startwerte.md. Das Anfangs-Loadout muss reichen,
    // sonst ist die erste Karte kaputt.
    const result = lauf(['armbrustturm', 'schleuder']);
    expect(result.won).toBe(true);
    expect(result.livesLeft).toBeGreaterThan(0);
  });

  it('ist mit einem vollen Loadout deutlich entspannter', () => {
    const knapp = lauf(['armbrustturm', 'schleuder']);
    const voll = lauf(['armbrustturm', 'schleuder', 'glutduese', 'frostturm']);
    expect(voll.won).toBe(true);
    expect(voll.livesLeft).toBeGreaterThan(knapp.livesLeft);
  });

  it('ist ohne jeden Schaden nicht zu gewinnen', () => {
    // Kontrolltuerme allein duerfen nie reichen. Sonst waere die Rolle
    // Unterstuetzung keine Rolle, sondern eine Abkuerzung.
    const result = lauf(['frostturm', 'netzwerfer']);
    expect(result.won).toBe(false);
  });

  it('endet in vertretbarer Zeit', () => {
    const result = lauf(['armbrustturm', 'schleuder', 'glutduese', 'frostturm']);
    expect(result.seconds).toBeGreaterThan(60);
    expect(result.seconds).toBeLessThan(600);
  });

  it('laesst keinen einzelnen Turm den Schaden allein tragen', () => {
    const result = lauf(['armbrustturm', 'schleuder', 'glutduese', 'frostturm']);
    const anteile = damageShare(result);
    expect(anteile.length).toBeGreaterThan(1);
    const groesster = anteile[0];
    expect(groesster).toBeDefined();
    if (groesster !== undefined) expect(groesster.share).toBeLessThan(0.8);
  });

  it('liefert bei gleichem Ausgangswert dasselbe Ergebnis', () => {
    const a = lauf(['armbrustturm', 'schleuder']);
    const b = lauf(['armbrustturm', 'schleuder']);
    expect(b.livesLeft).toBe(a.livesLeft);
    expect(b.seconds).toBe(a.seconds);
    expect(b.killed).toBe(a.killed);
  });
});

describe('Panzerung', () => {
  it('laesst rein physische Aufbauten an Eisen scheitern', () => {
    // Der Knochenschuetze traegt Eisen und laesst nur vierzig Prozent
    // physischen Schaden durch. Genau dafuer gibt es die Schadensarten.
    const result = lauf(['armbrustturm', 'schleuder']);
    const durch = result.leaksByEnemy.get('knochenschuetze') ?? 0;
    const andere = [...result.leaksByEnemy.entries()]
      .filter(([id]) => id !== 'knochenschuetze')
      .reduce((summe, [, wert]) => summe + wert, 0);
    expect(durch).toBeGreaterThan(andere);
  });
});
