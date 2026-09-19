/**
 * Levelerzeuger.
 *
 * Eine Karte wird von Hand nur dort entworfen, wo es zaehlt: durch den Weg.
 * Bauplaetze, Fallenplaetze, Requisiten und Fluessigkeiten entstehen daraus
 * bestimmt und wiederholbar. Das haelt zehn Karten handhabbar, ohne dass sie
 * beliebig wirken, weil der Weg jede Karte praegt.
 */

import type { Vec2 } from '@shared/math';
import type { BuildSlotDef, LevelDef, PropDef, Region, TileKind, WaveDef } from '@sim/model/types';
import { createRng } from '@sim/core/rng';

export interface LevelPlan {
  readonly id: string;
  readonly name: string;
  readonly region: Region;
  readonly breite: number;
  readonly hoehe: number;
  readonly paths: readonly (readonly Vec2[])[];
  readonly waves: readonly WaveDef[];
  readonly seed: number;
  /** Ungefaehre Anzahl der Bauplaetze neben dem Weg. */
  readonly bauplaetze: number;
  /** Anzahl der Plaetze auf dem Weg, nur fuer Fallen. */
  readonly fallenplaetze: number;
  readonly startGold: number;
  readonly lives: number;
  /** Faktor auf das Leben aller Gegner. Fehlt er, bleibt es bei eins. */
  readonly staerke?: number;
  readonly waveInterval: number;
  readonly albtraumMutator: string;
  /** Anteil der Karte, der mit Fluessigkeit bedeckt wird. */
  readonly fluessigAnteil: number;
}

const PROPS_JE_REGION: Readonly<Record<Region, readonly string[]>> = {
  wald: ['prop_baum', 'prop_baum', 'prop_busch', 'prop_fels'],
  glut: ['prop_basaltsaeule', 'prop_glutstein', 'prop_fels'],
  leere: ['prop_kristall', 'prop_truemmer', 'prop_truemmer'],
};

interface Abtastung {
  readonly x: number;
  readonly y: number;
  readonly nx: number;
  readonly ny: number;
}

/** Tastet alle Wege in festen Abstaenden ab und merkt sich die Senkrechte. */
function tasteWegeAb(paths: readonly (readonly Vec2[])[], schritt: number): Abtastung[] {
  const out: Abtastung[] = [];
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const von = path[i - 1];
      const nach = path[i];
      if (von === undefined || nach === undefined) continue;
      const dx = nach.x - von.x;
      const dy = nach.y - von.y;
      const laenge = Math.hypot(dx, dy);
      if (laenge === 0) continue;
      const anzahl = Math.max(1, Math.round(laenge / schritt));
      for (let s = 0; s < anzahl; s++) {
        const t = (s + 0.5) / anzahl;
        out.push({
          x: von.x + dx * t,
          y: von.y + dy * t,
          nx: -dy / laenge,
          ny: dx / laenge,
        });
      }
    }
  }
  return out;
}

export function abstandZumWeg(paths: readonly (readonly Vec2[])[], x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (a === undefined || b === undefined) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const laengeQuadrat = dx * dx + dy * dy;
      const t =
        laengeQuadrat === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / laengeQuadrat));
      const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
      if (d < best) best = d;
    }
  }
  return best;
}

export function erzeugeLevel(plan: LevelPlan): LevelDef {
  const rng = createRng(plan.seed);
  const abtastungen = tasteWegeAb(plan.paths, 1.6);

  // --- Bauplaetze neben dem Weg -------------------------------------------
  const slots: BuildSlotDef[] = [];
  const kandidaten: { x: number; y: number }[] = [];
  for (const punkt of abtastungen) {
    for (const seite of [1, -1]) {
      for (const abstand of [1.9, 3.1]) {
        kandidaten.push({
          x: punkt.x + punkt.nx * seite * abstand,
          y: punkt.y + punkt.ny * seite * abstand,
        });
      }
    }
  }

  // Erst alle gueltigen Plaetze sammeln, dann gleichmaessig ausduennen.
  // Wuerde man einfach die ersten zwoelf nehmen, laegen alle Tuerme am Anfang
  // des Weges und das Ende waere unverteidigt.
  const alleGueltigen: BuildSlotDef[] = [];
  for (const kandidat of kandidaten) {
    const x = Math.round(kandidat.x * 2) / 2;
    const y = Math.round(kandidat.y * 2) / 2;
    if (x < 0.5 || y < 0.5 || x > plan.breite - 0.5 || y > plan.hoehe - 0.5) continue;
    if (abstandZumWeg(plan.paths, x, y) < 1.4) continue;
    if (alleGueltigen.some((slot) => Math.hypot(slot.x - x, slot.y - y) < 1.9)) continue;
    alleGueltigen.push({ x, y, aufWeg: false });
  }

  if (alleGueltigen.length <= plan.bauplaetze) {
    slots.push(...alleGueltigen);
  } else {
    for (let i = 0; i < plan.bauplaetze; i++) {
      const index = Math.min(
        alleGueltigen.length - 1,
        Math.round((i * alleGueltigen.length) / plan.bauplaetze),
      );
      const slot = alleGueltigen[index];
      if (slot !== undefined && !slots.includes(slot)) slots.push(slot);
    }
  }

  // --- Fallenplaetze auf dem Weg ------------------------------------------
  const fallen: BuildSlotDef[] = [];
  if (plan.fallenplaetze > 0 && abtastungen.length > 0) {
    const schritt = Math.max(1, Math.floor(abtastungen.length / (plan.fallenplaetze + 1)));
    for (let i = 1; i <= plan.fallenplaetze; i++) {
      const punkt = abtastungen[Math.min(abtastungen.length - 1, i * schritt)];
      if (punkt === undefined) continue;
      const x = Math.round(punkt.x * 2) / 2;
      const y = Math.round(punkt.y * 2) / 2;
      if (x < 0 || y < 0 || x > plan.breite || y > plan.hoehe) continue;
      if (fallen.some((slot) => Math.hypot(slot.x - x, slot.y - y) < 2.5)) continue;
      fallen.push({ x, y, aufWeg: true });
    }
  }

  const alleSlots = [...slots, ...fallen];

  // --- Fluessigkeit --------------------------------------------------------
  const fluessig: { x: number; y: number }[] = [];
  const zielFluessig = Math.round(plan.breite * plan.hoehe * plan.fluessigAnteil);
  let versuche = 0;
  while (fluessig.length < zielFluessig && versuche < zielFluessig * 40) {
    versuche += 1;
    const x = rng.int(0, plan.breite - 1);
    const y = rng.int(0, plan.hoehe - 1);
    if (abstandZumWeg(plan.paths, x + 0.5, y + 0.5) < 2.2) continue;
    if (alleSlots.some((slot) => Math.hypot(slot.x - (x + 0.5), slot.y - (y + 0.5)) < 1.6)) continue;
    if (fluessig.some((feld) => feld.x === x && feld.y === y)) continue;
    // Pfuetzen statt Streusel: nur neben vorhandene Felder setzen, wenn es
    // schon welche gibt.
    if (
      fluessig.length > 0 &&
      fluessig.length % 4 !== 0 &&
      !fluessig.some((feld) => Math.abs(feld.x - x) + Math.abs(feld.y - y) === 1)
    ) {
      continue;
    }
    fluessig.push({ x, y });
  }

  // --- Requisiten ----------------------------------------------------------
  const modelle = PROPS_JE_REGION[plan.region];
  const props: PropDef[] = [];
  const zielProps = Math.round(plan.breite * plan.hoehe * 0.09);
  versuche = 0;
  while (props.length < zielProps && versuche < zielProps * 40) {
    versuche += 1;
    const x = rng.int(0, plan.breite - 1) + 0.5;
    const y = rng.int(0, plan.hoehe - 1) + 0.5;
    if (abstandZumWeg(plan.paths, x, y) < 1.6) continue;
    if (alleSlots.some((slot) => Math.hypot(slot.x - x, slot.y - y) < 1.3)) continue;
    if (fluessig.some((feld) => feld.x === Math.floor(x) && feld.y === Math.floor(y))) continue;
    if (props.some((prop) => Math.hypot(prop.x - x, prop.y - y) < 1.2)) continue;
    const model = modelle[rng.int(0, modelle.length - 1)] ?? 'prop_fels';
    props.push({ x, y, model, dir: rng.int(0, 3) });
  }

  // Fackeln an einigen Bauplaetzen. Kleines Detail, grosse Wirkung.
  alleSlots.forEach((slot, index) => {
    if (slot.aufWeg || index % 3 !== 0) return;
    props.push({ x: slot.x + 0.75, y: slot.y + 0.75, model: 'prop_fackel', dir: 0 });
  });

  // --- Kachelarten ---------------------------------------------------------
  const kacheln: TileKind[] = [];
  for (let y = 0; y < plan.hoehe; y++) {
    for (let x = 0; x < plan.breite; x++) {
      const mitte = { x: x + 0.5, y: y + 0.5 };
      if (abstandZumWeg(plan.paths, mitte.x, mitte.y) < 0.8) {
        kacheln.push('weg');
      } else if (fluessig.some((feld) => feld.x === x && feld.y === y)) {
        kacheln.push('fluessig');
      } else {
        kacheln.push('boden');
      }
    }
  }

  // Wegkacheln ausserhalb der Karte, damit Ein- und Ausgang nicht im Nichts
  // haengen.
  const randWeg: { x: number; y: number }[] = [];
  for (let y = -2; y < plan.hoehe + 2; y++) {
    for (let x = -2; x < plan.breite + 2; x++) {
      if (x >= 0 && y >= 0 && x < plan.breite && y < plan.hoehe) continue;
      if (abstandZumWeg(plan.paths, x + 0.5, y + 0.5) < 0.9) randWeg.push({ x, y });
    }
  }

  return {
    id: plan.id,
    name: plan.name,
    region: plan.region,
    kacheln,
    randWeg,
    breite: plan.breite,
    hoehe: plan.hoehe,
    paths: plan.paths,
    buildSlots: alleSlots,
    props,
    fluessig,
    startGold: plan.startGold,
    lives: plan.lives,
    staerke: plan.staerke ?? 1,
    waveInterval: plan.waveInterval,
    waves: plan.waves,
    albtraumMutator: plan.albtraumMutator,
  };
}
