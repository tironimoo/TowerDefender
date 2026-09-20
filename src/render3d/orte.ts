/**
 * Wo Hoehle und Burg einer Karte stehen.
 *
 * Getrennt von der Darstellung, damit ein Test es nachrechnen kann, ohne
 * einen Browser zu brauchen.
 */

import type { LevelDef } from '@sim/index';

/** Wie weit vor dem Pfadanfang beziehungsweise hinter dem Ziel. */
export const SCHRITT_NACH_AUSSEN = 0.55;

export interface Ort {
  readonly art: 'hoehle' | 'burg';
  readonly x: number;
  readonly z: number;
  /** Drehung um die Hochachse, damit das Modell in die Richtung schaut. */
  readonly drehung: number;
}

function richtung(ax: number, az: number, bx: number, bz: number): [number, number] {
  const laenge = Math.hypot(bx - ax, bz - az) || 1;
  return [(bx - ax) / laenge, (bz - az) / laenge];
}

/**
 * Ein Pfad ist ein Polygonzug, kein Kachelpfad: zwischen zwei Punkten koennen
 * zehn Kacheln liegen. Deshalb zaehlt nur die Richtung der ersten und der
 * letzten Strecke, nie ihre Laenge.
 */
export function orteDerKarte(level: LevelDef): readonly Ort[] {
  const orte: Ort[] = [];
  const gesehen = new Set<string>();
  const merke = (art: Ort['art'], x: number, z: number, drehung: number): void => {
    const schluessel = `${art} ${Math.round(x * 2)},${Math.round(z * 2)}`;
    if (gesehen.has(schluessel)) return;
    gesehen.add(schluessel);
    orte.push({ art, x, z, drehung });
  };

  for (const pfad of level.paths) {
    const anfang = pfad[0];
    const zweiter = pfad[1];
    if (anfang !== undefined && zweiter !== undefined) {
      const [dx, dz] = richtung(anfang.x, anfang.y, zweiter.x, zweiter.y);
      merke(
        'hoehle',
        anfang.x - dx * SCHRITT_NACH_AUSSEN,
        anfang.y - dz * SCHRITT_NACH_AUSSEN,
        Math.atan2(dx, dz),
      );
    }
    const ende = pfad[pfad.length - 1];
    const vorletzter = pfad[pfad.length - 2];
    if (ende === undefined || vorletzter === undefined) continue;
    const [dx, dz] = richtung(vorletzter.x, vorletzter.y, ende.x, ende.y);
    // Die Burg schaut den Gegnern entgegen: ihr Tor zeigt dorthin, woher sie
    // kommen.
    merke(
      'burg',
      ende.x + dx * SCHRITT_NACH_AUSSEN,
      ende.y + dz * SCHRITT_NACH_AUSSEN,
      Math.atan2(-dx, -dz),
    );
  }
  return orte;
}
