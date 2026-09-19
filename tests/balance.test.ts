/**
 * Balancing-Pruefungen.
 *
 * Diese Tests rechnen ganze Level ohne Grafik durch. Sie sind der Schutz davor,
 * dass eine Aenderung an Zahlen ein Level unspielbar macht, ohne dass es jemand
 * merkt. Sie messen mit der Staerke, die ein Spieler an dieser Stelle im Spiel
 * tatsaechlich haette, siehe tools/sim-runner/erwartung.ts.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import type { Difficulty } from '@sim/index';
import { damageShare, simulate } from '../tools/sim-runner/simulate';
import { erwarteteBoni } from '../tools/sim-runner/erwartung';

const content = loadContent();

/** Loadouts, die ein aufmerksamer Spieler zur Verfuegung haette. */
const LOADOUTS: readonly (readonly string[])[] = [
  ['armbrustturm', 'schleuder'],
  ['armbrustturm', 'schleuder', 'frostturm', 'glutduese'],
  ['armbrustturm', 'balliste', 'frostturm', 'blitzspule'],
  ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'],
  ['blitzspule', 'balliste', 'spaehturm', 'leuchtfeuer'],
  ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'],
];

function lauf(levelId: string, loadout: readonly string[], levelIndex = 0, difficulty: Difficulty = 'normal') {
  return simulate({
    content,
    levelId,
    difficulty,
    loadout,
    seed: 1,
    boni: erwarteteBoni(levelIndex),
  });
}

describe('Level 1', () => {
  it('ist mit Armbrustturm und Schleuder allein zu gewinnen', () => {
    // Pruefung 1 aus docs/05-startwerte.md. Das Anfangs-Loadout muss reichen,
    // sonst ist die erste Karte kaputt.
    const ergebnis = lauf('level-01', ['armbrustturm', 'schleuder']);
    expect(ergebnis.won).toBe(true);
    expect(ergebnis.livesLeft).toBeGreaterThan(0);
  });

  it('ist ohne jeden Schaden nicht zu gewinnen', () => {
    // Kontrolltuerme allein duerfen nie reichen. Der Frostturm richtet zwar
    // etwas arkanen Schaden an, der Netzwerfer gar keinen.
    const ergebnis = lauf('level-01', ['netzwerfer', 'spaehturm']);
    expect(ergebnis.won).toBe(false);
  });

  it('endet in vertretbarer Zeit', () => {
    const ergebnis = lauf('level-01', ['armbrustturm', 'schleuder', 'frostturm', 'glutduese']);
    expect(ergebnis.seconds).toBeGreaterThan(60);
    expect(ergebnis.seconds).toBeLessThan(600);
  });

  it('liefert bei gleichem Ausgangswert dasselbe Ergebnis', () => {
    const a = lauf('level-01', ['armbrustturm', 'schleuder']);
    const b = lauf('level-01', ['armbrustturm', 'schleuder']);
    expect(b.livesLeft).toBe(a.livesLeft);
    expect(b.seconds).toBe(a.seconds);
    expect(b.killed).toBe(a.killed);
  });
});

describe('Alle Karten', () => {
  it('sind auf Normal mit einem passenden Loadout zu schaffen', () => {
    const gescheitert: string[] = [];
    content.levelReihenfolge.forEach((levelId, index) => {
      const geschafft = LOADOUTS.some((loadout) => lauf(levelId, loadout, index).won);
      if (!geschafft) gescheitert.push(levelId);
    });
    expect(gescheitert).toEqual([]);
  });

  it('brauchen mit wachsender Nummer laenger', () => {
    const erste = lauf('level-01', ['armbrustturm', 'schleuder', 'frostturm', 'glutduese'], 0);
    const letzte = lauf('level-10', ['blitzspule', 'balliste', 'spaehturm', 'leuchtfeuer'], 9);
    expect(letzte.seconds).toBeGreaterThan(erste.seconds);
  });

  /**
   * Gemessen wird der Aufbau des AutoPlayers, nicht das Spiel selbst - aber
   * auf einer Karte, die noch etwas fordert.
   *
   * Der Test stand frueher auf Karte 7. Seit die mittleren Karten entschaerft
   * sind, gewinnt der Bot dort mit vollen Leben und einer einzigen Turmart:
   * der Wert sagte dann nichts mehr ueber das Spiel aus, nur noch darueber,
   * dass die Karte bequem geworden ist. Auf Karte 9 muss er weiterhin mischen,
   * und genau diese Eigenschaft ist es wert, bewacht zu werden.
   */
  it('zwingen auf einer fordernden Karte zu mehr als einer Turmart', () => {
    const ergebnis = lauf(
      'level-09',
      ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'],
      8,
    );
    const anteile = damageShare(ergebnis);
    expect(anteile.length).toBeGreaterThan(1);
    const groesster = anteile[0];
    expect(groesster).toBeDefined();
    if (groesster !== undefined) expect(groesster.share).toBeLessThan(0.85);
  });
});

describe('Schadensarten', () => {
  it('machen Arkan in den Leerlanden deutlich ueberlegen', () => {
    // Frueher stand hier, ein rein physischer Aufbau muesse scheitern. Das war
    // die Fassung, in der aetherische Gegner gar keinen physischen Schaden
    // durchliessen - eine Sperre, keine Schwierigkeit. Jetzt gilt die
    // schwaechere, aber ehrlichere Aussage: physisch geht, kostet aber
    // spuerbar.
    const physisch = lauf('level-08', ['armbrustturm', 'schleuder', 'balliste'], 7);
    const arkan = lauf('level-08', ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'], 7);
    expect(arkan.livesLeft).toBeGreaterThan(physisch.livesLeft + 4);

    // Auf der letzten Karte reicht physisch allein dann doch nicht mehr. Ohne
    // diese zweite Pruefung waere die Schadensart am Ende belanglos.
    const physischFinale = lauf('level-10', ['armbrustturm', 'schleuder', 'balliste'], 9);
    const arkanFinale = lauf('level-10', ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'], 9);
    expect(physischFinale.won).toBe(false);
    expect(arkanFinale.won).toBe(true);
  });

  it('machen Panzerung zu einem echten Hindernis', () => {
    // Der Knochenschuetze traegt Eisen und laesst nur vierzig Prozent
    // physischen Schaden durch. Arkan trifft ihn voll.
    const physisch = lauf('level-03', ['armbrustturm', 'schleuder'], 2);
    const gemischt = lauf('level-03', ['armbrustturm', 'blitzspule', 'frostturm'], 2);
    expect(gemischt.livesLeft).toBeGreaterThanOrEqual(physisch.livesLeft);
  });
});

describe('Schwierigkeitsgrade', () => {
  it('sind spuerbar unterschiedlich', () => {
    const loadout = ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'];
    const normal = lauf('level-03', loadout, 2, 'normal');
    const hart = lauf('level-03', loadout, 2, 'hart');
    expect(hart.waveCount).toBeGreaterThan(normal.waveCount);
    expect(hart.livesLeft).toBeLessThanOrEqual(normal.livesLeft);
  });
});
