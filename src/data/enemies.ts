/**
 * Gegnerdefinitionen.
 *
 * Fast jeder Gegner hat genau eine Eigenschaft, die den Spieler zu einer
 * Antwort zwingt. Ein Gegner, der nur mehr aushaelt, ist kein neuer Gegner.
 * Grundwerte aus docs/05-startwerte.md.
 */

import type { BossPhase, EnemyBehaviour, EnemyDef } from '@sim/model/types';

interface Kurz {
  id: string;
  name: string;
  health: number;
  speed: number;
  armor: EnemyDef['armor'];
  gold: number;
  flying?: boolean;
  invisible?: boolean;
  immun?: EnemyDef['immun'];
  schild?: number;
  behaviour?: EnemyBehaviour;
  leakCost?: number;
  boss?: readonly BossPhase[];
  sheet?: string;
}

function gegner(k: Kurz): EnemyDef {
  return {
    id: k.id,
    name: k.name,
    health: k.health,
    speed: k.speed,
    armor: k.armor,
    gold: k.gold,
    flying: k.flying ?? false,
    invisible: k.invisible ?? false,
    immun: k.immun ?? [],
    schild: k.schild ?? 0,
    behaviour: k.behaviour ?? { kind: 'keines' },
    leakCost: k.leakCost ?? 1,
    boss: k.boss === undefined ? null : { phasen: k.boss },
    sheet: k.sheet ?? `gegner-${k.id}`,
  };
}

export const ENEMY_DEFS: readonly EnemyDef[] = [
  // --- Waldsenke -----------------------------------------------------------
  gegner({
    id: 'moderling',
    name: 'Moderling',
    health: 60,
    speed: 0.8,
    armor: 'leder',
    gold: 8,
  }),
  gegner({
    id: 'krabbler',
    name: 'Krabbler',
    health: 18,
    speed: 2.2,
    armor: 'leder',
    gold: 3,
  }),
  gegner({
    id: 'knochenschuetze',
    name: 'Knochenschuetze',
    health: 90,
    speed: 1.0,
    armor: 'eisen',
    gold: 13,
    behaviour: { kind: 'stoert', radius: 2.6, duration: 2.5, interval: 6 },
  }),
  gegner({
    id: 'sprengling',
    name: 'Sprengling',
    health: 45,
    speed: 1.6,
    armor: 'leder',
    gold: 10,
    behaviour: { kind: 'sprengt', radius: 1.7, duration: 3 },
  }),

  // --- Glutschlucht --------------------------------------------------------
  gegner({
    id: 'magmakoloss',
    name: 'Magmakoloss',
    health: 480,
    speed: 0.5,
    armor: 'obsidian',
    gold: 38,
    behaviour: { kind: 'teilt', childId: 'kolosssplitter', count: 2 },
  }),
  gegner({
    id: 'kolosssplitter',
    name: 'Kolosssplitter',
    health: 120,
    speed: 0.9,
    armor: 'obsidian',
    gold: 6,
    sheet: 'gegner-magmakoloss',
  }),
  gegner({
    id: 'aschefalter',
    name: 'Aschefalter',
    health: 70,
    speed: 1.8,
    armor: 'leder',
    gold: 12,
    flying: true,
  }),
  gegner({
    id: 'glutgeist',
    name: 'Glutgeist',
    health: 140,
    speed: 1.2,
    armor: 'obsidian',
    gold: 18,
    immun: ['feuer'],
    behaviour: { kind: 'stoert', radius: 2.2, duration: 2, interval: 5 },
  }),
  gegner({
    id: 'schildwart',
    name: 'Schildwart',
    health: 200,
    speed: 0.9,
    armor: 'eisen',
    gold: 26,
    behaviour: { kind: 'schildet', radius: 3.2, shield: 70, interval: 4 },
  }),

  // --- Leerlande -----------------------------------------------------------
  gegner({
    id: 'schreiter',
    name: 'Schreiter',
    health: 260,
    speed: 1.1,
    armor: 'aetherisch',
    gold: 28,
    behaviour: { kind: 'springt', distance: 3.5, interval: 5 },
  }),
  gegner({
    id: 'leerenbrut',
    name: 'Leerenbrut',
    health: 120,
    speed: 2.4,
    armor: 'leder',
    gold: 20,
    invisible: true,
  }),
  gegner({
    id: 'echo',
    name: 'Echo',
    health: 180,
    speed: 1.0,
    armor: 'aetherisch',
    gold: 30,
    behaviour: { kind: 'heilt', radius: 3.5, amount: 34, interval: 2.5 },
  }),
  gegner({
    id: 'rissgaenger',
    name: 'Rissgaenger',
    health: 420,
    speed: 1.0,
    armor: 'eisen',
    gold: 44,
    behaviour: { kind: 'rast', threshold: 0.5, factor: 2 },
  }),

  // --- Bosse ---------------------------------------------------------------
  gegner({
    id: 'waldwaechter',
    name: 'Waldwaechter',
    health: 2600,
    speed: 0.55,
    armor: 'eisen',
    gold: 220,
    leakCost: 20,
    sheet: 'boss-waldwaechter',
    boss: [
      { abLebensanteil: 1.0, armor: 'eisen', speedFactor: 1, unverwundbar: 0, ruft: null, stoert: null },
      {
        abLebensanteil: 0.55,
        armor: 'eisen',
        speedFactor: 0.8,
        unverwundbar: 3,
        ruft: { enemyId: 'krabbler', count: 12 },
        stoert: null,
      },
      {
        abLebensanteil: 0.25,
        armor: 'leder',
        speedFactor: 1.3,
        unverwundbar: 2,
        ruft: { enemyId: 'moderling', count: 6 },
        stoert: null,
      },
    ],
  }),
  gegner({
    id: 'schmelzherz',
    name: 'Schmelzherz',
    health: 4200,
    speed: 0.5,
    armor: 'obsidian',
    gold: 300,
    leakCost: 20,
    sheet: 'boss-schmelzherz',
    boss: [
      {
        abLebensanteil: 1.0,
        armor: 'obsidian',
        speedFactor: 1,
        unverwundbar: 0,
        ruft: null,
        stoert: null,
      },
      {
        abLebensanteil: 0.75,
        armor: 'obsidian',
        speedFactor: 1,
        unverwundbar: 2,
        ruft: null,
        stoert: { radius: 4, duration: 3 },
      },
      {
        abLebensanteil: 0.5,
        armor: 'eisen',
        speedFactor: 1.15,
        unverwundbar: 2,
        ruft: { enemyId: 'glutgeist', count: 4 },
        stoert: { radius: 4, duration: 3 },
      },
      {
        abLebensanteil: 0.25,
        armor: 'obsidian',
        speedFactor: 1.35,
        unverwundbar: 2,
        ruft: null,
        stoert: { radius: 5, duration: 4 },
      },
    ],
  }),
  gegner({
    id: 'verschlinger',
    name: 'Der Verschlinger',
    health: 7200,
    speed: 0.5,
    armor: 'obsidian',
    gold: 420,
    leakCost: 20,
    sheet: 'boss-verschlinger',
    boss: [
      // In jeder Phase wirkt genau eine Schadensart richtig gut. Wer nur eine
      // Art mitbringt, scheitert spaetestens hier.
      {
        abLebensanteil: 1.0,
        armor: 'obsidian',
        speedFactor: 1,
        unverwundbar: 0,
        ruft: null,
        stoert: null,
      },
      {
        abLebensanteil: 0.66,
        armor: 'eisen',
        speedFactor: 1.1,
        unverwundbar: 3,
        ruft: { enemyId: 'leerenbrut', count: 6 },
        stoert: { radius: 4, duration: 3 },
      },
      {
        abLebensanteil: 0.33,
        armor: 'aetherisch',
        speedFactor: 1.2,
        unverwundbar: 3,
        ruft: { enemyId: 'echo', count: 3 },
        stoert: { radius: 5, duration: 4 },
      },
    ],
  }),
];
