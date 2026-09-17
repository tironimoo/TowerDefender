/**
 * Woechentliche Herausforderung.
 *
 * Feste Karte, festes Loadout, fester Mutator, fester Ausgangswert des
 * Zufalls. Fuer alle gleich und jede Woche neu. Kostet fast nichts, weil die
 * Simulation ohnehin mit gesetztem Zufall arbeitet.
 *
 * Siehe docs/02-progression.md.
 */

import type { Content, Difficulty } from '@sim/index';
import { createRng } from '@sim/index';

export interface Herausforderung {
  /** Fortlaufende Wochennummer seit dem Beginn der Zeitrechnung. */
  readonly woche: number;
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly mutatorId: string;
  readonly loadout: readonly string[];
  readonly seed: number;
}

/** Wochennummer nach ISO, gezaehlt ab dem 1. Januar 1970. */
export function wochenNummer(jetzt: number): number {
  // Der 1. Januar 1970 war ein Donnerstag. Der Versatz verschiebt den
  // Wochenwechsel auf Montag null Uhr UTC.
  const tage = Math.floor(jetzt / 86400000);
  return Math.floor((tage + 3) / 7);
}

/**
 * Die Herausforderung einer Woche.
 * Gleiche Woche und gleiche Inhalte ergeben immer dasselbe Ergebnis.
 */
export function herausforderungFuer(woche: number, content: Content): Herausforderung {
  const rng = createRng(woche * 2654435761);
  const level = content.levelReihenfolge[rng.int(0, content.levelReihenfolge.length - 1)];
  if (level === undefined) throw new Error('Keine Karten vorhanden.');

  const grade: readonly Difficulty[] = ['normal', 'hart', 'albtraum'];
  const difficulty = grade[rng.int(0, grade.length - 1)] ?? 'normal';

  const mutatoren = [...content.mutators.keys()].sort();
  const mutatorId = mutatoren[rng.int(0, mutatoren.length - 1)] ?? '';

  // Vier Tuerme aus allen zwoelf, unabhaengig von der Forschung. Die Woche
  // ist eine Aufgabe, keine Belohnung fuer Fortschritt.
  const alle = [...content.towers.keys()].sort();
  const loadout: string[] = [];
  while (loadout.length < 4 && alle.length > 0) {
    const index = rng.int(0, alle.length - 1);
    const gewaehlt = alle.splice(index, 1)[0];
    if (gewaehlt !== undefined) loadout.push(gewaehlt);
  }
  // Ohne Schaden waere die Woche unspielbar.
  const hatSchaden = loadout.some((id) => (content.towers.get(id)?.damage ?? 0) > 0);
  if (!hatSchaden) loadout[0] = 'armbrustturm';

  return {
    woche,
    levelId: level,
    difficulty,
    mutatorId,
    loadout: loadout.sort(),
    seed: woche * 7919 + 13,
  };
}

/** Kurze Beschreibung fuer die Oberflaeche. */
export function beschreibe(h: Herausforderung, content: Content): string {
  const level = content.levels.get(h.levelId);
  const mutator = content.mutators.get(h.mutatorId);
  const tuerme = h.loadout
    .map((id) => content.towers.get(id)?.name ?? id)
    .join(', ');
  return `${level?.name ?? h.levelId} · ${h.difficulty} · ${mutator?.name ?? 'ohne Mutator'} · ${tuerme}`;
}
