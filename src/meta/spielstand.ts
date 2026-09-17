/**
 * Spielstand.
 *
 * Ein JSON-Objekt mit Versionsnummer. Beim Laden laeuft es durch eine Kette
 * von Migrationen bis zur aktuellen Version. Diese Kette entsteht ab dem
 * ersten Tag, nicht nachtraeglich. Nachtraeglich bedeutet, dass irgendwann
 * alle Spielstaende verloren gehen.
 *
 * Siehe docs/03-architektur.md, Abschnitt Speicherstand.
 */

import type { Difficulty } from '@sim/index';
import { speicher } from '@platform/speicher';

export const AKTUELLE_VERSION = 1;
const SCHLUESSEL = 'towerdefender.spielstand';

export interface MeisterschaftStand {
  erfahrung: number;
  /** Gewaehlte Spezialisierungen, je Wahlstufe eine. */
  wahlen: string[];
}

export interface Einstellungen {
  ton: boolean;
  musik: boolean;
  vibration: boolean;
  /** Zuletzt benutzte Geschwindigkeit. */
  tempo: number;
}

export interface Spielstand {
  version: number;
  splitter: number;
  /** Ausgegebene Splitter, fuer die Anzeige. */
  ausgegeben: number;
  forschung: string[];
  /** Sterne je Karte und Schwierigkeit. */
  sterne: Record<string, Partial<Record<Difficulty, number>>>;
  meisterschaft: Record<string, MeisterschaftStand>;
  /** Zuletzt benutztes Loadout je Karte. */
  loadouts: Record<string, string[]>;
  /** Bestleistung im Endlos-Modus je Karte. */
  endlos: Record<string, number>;
  einstellungen: Einstellungen;
}

export function neuerStand(): Spielstand {
  return {
    version: AKTUELLE_VERSION,
    splitter: 0,
    ausgegeben: 0,
    forschung: [],
    sterne: {},
    meisterschaft: {},
    loadouts: {},
    endlos: {},
    einstellungen: { ton: true, musik: true, vibration: true, tempo: 1 },
  };
}

/**
 * Migrationen.
 *
 * Jeder Eintrag hebt einen Stand von seiner Version auf die naechste. Neue
 * Felder bekommen hier ihren Standardwert.
 */
const MIGRATIONEN: readonly ((stand: Record<string, unknown>) => Record<string, unknown>)[] = [
  // Version 0 auf 1: es gab noch keine veroeffentlichte Version 0. Der Eintrag
  // steht hier, damit die Kette von Anfang an existiert.
  (stand) => ({ ...stand, version: 1 }),
];

export function migriere(roh: unknown): Spielstand {
  if (typeof roh !== 'object' || roh === null) return neuerStand();
  let stand = roh as Record<string, unknown>;
  let version = typeof stand['version'] === 'number' ? (stand['version'] as number) : 0;

  while (version < AKTUELLE_VERSION) {
    const migration = MIGRATIONEN[version];
    if (migration === undefined) break;
    stand = migration(stand);
    version += 1;
  }

  // Fehlende Felder auffuellen, damit ein beschaedigter Stand nicht abstuerzt.
  const vorlage = neuerStand();
  return {
    version: AKTUELLE_VERSION,
    splitter: zahl(stand['splitter'], vorlage.splitter),
    ausgegeben: zahl(stand['ausgegeben'], vorlage.ausgegeben),
    forschung: Array.isArray(stand['forschung']) ? (stand['forschung'] as string[]) : [],
    sterne: (stand['sterne'] as Spielstand['sterne']) ?? {},
    meisterschaft: (stand['meisterschaft'] as Spielstand['meisterschaft']) ?? {},
    loadouts: (stand['loadouts'] as Spielstand['loadouts']) ?? {},
    endlos: (stand['endlos'] as Spielstand['endlos']) ?? {},
    einstellungen: {
      ...vorlage.einstellungen,
      ...((stand['einstellungen'] as Partial<Einstellungen>) ?? {}),
    },
  };
}

function zahl(wert: unknown, ersatz: number): number {
  return typeof wert === 'number' && Number.isFinite(wert) ? wert : ersatz;
}

export async function lade(): Promise<Spielstand> {
  const roh = await speicher.lies(SCHLUESSEL);
  if (roh === null) return neuerStand();
  try {
    return migriere(JSON.parse(roh));
  } catch {
    // Ein beschaedigter Stand darf das Spiel nicht blockieren.
    return neuerStand();
  }
}

export async function sichere(stand: Spielstand): Promise<void> {
  await speicher.schreibe(SCHLUESSEL, JSON.stringify(stand));
}

export async function loesche(): Promise<void> {
  await speicher.entferne(SCHLUESSEL);
}

// --- Bequeme Zugriffe -------------------------------------------------------

export function sterneFuer(stand: Spielstand, levelId: string, difficulty: Difficulty): number {
  return stand.sterne[levelId]?.[difficulty] ?? 0;
}

export function sterneGesamt(stand: Spielstand): number {
  let summe = 0;
  for (const je of Object.values(stand.sterne)) {
    for (const wert of Object.values(je)) summe += wert ?? 0;
  }
  return summe;
}

export function meisterschaftFuer(stand: Spielstand, turmId: string): MeisterschaftStand {
  const vorhanden = stand.meisterschaft[turmId];
  if (vorhanden !== undefined) return vorhanden;
  const neu: MeisterschaftStand = { erfahrung: 0, wahlen: [] };
  stand.meisterschaft[turmId] = neu;
  return neu;
}
