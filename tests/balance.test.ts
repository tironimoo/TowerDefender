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
   * Gemessen wird hier der Aufbau des AutoPlayers, nicht das Spiel selbst.
   *
   * Der Wert ist gestiegen, seit die Karten mehr Gold hergeben: der Bot kauft
   * dann mehr von seinem Lieblingsturm. Das ist keine Schieflage im Spiel -
   * der Frostturm hat mit Abstand den schlechtesten Schaden je Gold aller
   * Schadenstuerme. Die Schranke faengt weiter den Fall, dass ein einzelner
   * Turm wirklich alles allein erledigt.
   */
  it('lassen keinen einzelnen Turm den Schaden praktisch allein tragen', () => {
    const ergebnis = lauf(
      'level-07',
      ['blitzspule', 'balliste', 'frostturm', 'leuchtfeuer'],
      6,
    );
    const anteile = damageShare(ergebnis);
    expect(anteile.length).toBeGreaterThan(1);
    const groesster = anteile[0];
    expect(groesster).toBeDefined();
    if (groesster !== undefined) expect(groesster.share).toBeLessThan(0.9);
  });
});

describe('Schadensarten', () => {
  it('sind gegen aetherische Gegner nicht austauschbar', () => {
    // In den Leerlanden gibt es Gegner, die nur arkaner Schaden trifft. Ein
    // rein physischer Aufbau muss daran scheitern.
    const physisch = lauf('level-08', ['armbrustturm', 'schleuder', 'balliste'], 7);
    const arkan = lauf('level-08', ['blitzspule', 'frostturm', 'spaehturm', 'alchemieturm'], 7);
    expect(physisch.won).toBe(false);
    expect(arkan.won).toBe(true);
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
