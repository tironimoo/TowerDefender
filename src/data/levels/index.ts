/**
 * Die zehn Karten.
 *
 * Handentworfen ist der Weg. Alles andere entsteht daraus, siehe erzeuge.ts.
 * Die Wellen kommen aus einem Plan je Karte, siehe wellen.ts.
 */

import type { LevelDef } from '@sim/model/types';
import { erzeugeLevel } from './erzeuge';
import type { PoolEintrag } from './wellen';
import { erzeugeWellen } from './wellen';

/**
 * Die ersten beiden Karten fuehren behutsam ein.
 *
 * Panzerung kommt erst in Karte drei. Sonst scheitert das Anfangs-Loadout an
 * einer Lektion, die es noch gar nicht lernen konnte.
 */
const POOL_LEVEL_01: readonly PoolEintrag[] = [
  { enemyId: 'moderling', ab: 1, gewicht: 3, basis: 5, wachstum: 3.4, abstand: 1.2 },
  { enemyId: 'krabbler', ab: 5, gewicht: 2, basis: 5, wachstum: 3.0, abstand: 0.7 },
];

const POOL_LEVEL_02: readonly PoolEintrag[] = [
  { enemyId: 'moderling', ab: 1, gewicht: 3, basis: 5, wachstum: 3.6, abstand: 1.2 },
  { enemyId: 'krabbler', ab: 3, gewicht: 2.2, basis: 5, wachstum: 3.4, abstand: 0.65 },
  { enemyId: 'sprengling', ab: 7, gewicht: 1.2, basis: 2, wachstum: 3.0, abstand: 1.4 },
];

const WALD_POOL: readonly PoolEintrag[] = [
  { enemyId: 'moderling', ab: 1, gewicht: 3, basis: 5, wachstum: 3.2, abstand: 1.2 },
  { enemyId: 'krabbler', ab: 4, gewicht: 2.2, basis: 6, wachstum: 3.2, abstand: 0.6 },
  { enemyId: 'knochenschuetze', ab: 4, gewicht: 1.4, basis: 2, wachstum: 3.2, abstand: 1.8 },
  { enemyId: 'sprengling', ab: 7, gewicht: 1.2, basis: 2, wachstum: 3.5, abstand: 1.4 },
];

const GLUT_POOL: readonly PoolEintrag[] = [
  { enemyId: 'glutgeist', ab: 1, gewicht: 2.2, basis: 3, wachstum: 3.2, abstand: 1.4 },
  { enemyId: 'knochenschuetze', ab: 1, gewicht: 1.6, basis: 3, wachstum: 3.2, abstand: 1.7 },
  { enemyId: 'magmakoloss', ab: 4, gewicht: 1.2, basis: 1, wachstum: 3.2, abstand: 3.0 },
  { enemyId: 'schildwart', ab: 6, gewicht: 1.3, basis: 1, wachstum: 3.2, abstand: 2.2 },
];

const GLUT_POOL_LUFT: readonly PoolEintrag[] = [
  ...GLUT_POOL,
  { enemyId: 'aschefalter', ab: 1, gewicht: 2.0, basis: 4, wachstum: 3.2, abstand: 0.9 },
];

/**
 * Die Leerlande fuehren ihre schweren Gegner spaeter ein als frueher.
 *
 * Der rissgaenger kam ab Welle sieben, und genau dort starben im Messlauf alle
 * Loadouts ausser einem - auf allen drei Leere-Karten, bei exakt derselben
 * Welle. Vierhundertzwanzig Leben hinter Eisenpanzerung sind kein Anstieg,
 * sondern eine Tuer, die zufaellt. Ab Welle zehn bleibt er gefaehrlich, aber
 * der Spieler hat dann drei Wellen mehr Gold gesehen.
 */
const LEERE_POOL: readonly PoolEintrag[] = [
  { enemyId: 'schreiter', ab: 1, gewicht: 2.0, basis: 2, wachstum: 3.2, abstand: 1.8 },
  { enemyId: 'leerenbrut', ab: 3, gewicht: 2.0, basis: 3, wachstum: 3.2, abstand: 0.9 },
  { enemyId: 'echo', ab: 6, gewicht: 1.2, basis: 1, wachstum: 3.0, abstand: 2.4 },
  { enemyId: 'rissgaenger', ab: 10, gewicht: 1.2, basis: 1, wachstum: 3.2, abstand: 2.6 },
  { enemyId: 'aschefalter', ab: 2, gewicht: 1.4, basis: 3, wachstum: 3.2, abstand: 1.0 },
];

export const LEVEL_DEFS: readonly LevelDef[] = [
  erzeugeLevel({
    id: 'level-01',
    name: 'Lichtung am Moorbach',
    region: 'wald',
    breite: 20,
    hoehe: 12,
    seed: 101,
    paths: [
      [
        { x: -1, y: 6 },
        { x: 5, y: 6 },
        { x: 5, y: 2 },
        { x: 12, y: 2 },
        { x: 12, y: 9 },
        { x: 18, y: 9 },
        { x: 21, y: 9 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 10,
      seed: 1001,
      pool: POOL_LEVEL_01,
      pfade: 1,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 12,
    fallenplaetze: 2,
    startGold: 250,
    lives: 20,
    staerke: 1.55,
    waveInterval: 20,
    albtraumMutator: 'hetze',
    fluessigAnteil: 0.05,
  }),
  erzeugeLevel({
    id: 'level-02',
    name: 'Nebelsenke',
    region: 'wald',
    breite: 22,
    hoehe: 13,
    seed: 102,
    paths: [
      [
        { x: -1, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 9 },
        { x: 9, y: 9 },
        { x: 9, y: 3 },
        { x: 15, y: 3 },
        { x: 15, y: 10 },
        { x: 23, y: 10 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 10,
      seed: 1002,
      pool: POOL_LEVEL_02,
      pfade: 1,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 14,
    fallenplaetze: 3,
    startGold: 250,
    lives: 20,
    staerke: 1.6,
    waveInterval: 20,
    albtraumMutator: 'kurzsichtig',
    fluessigAnteil: 0.06,
  }),
  erzeugeLevel({
    id: 'level-03',
    name: 'Zwei Furten',
    region: 'wald',
    breite: 22,
    hoehe: 13,
    seed: 103,
    paths: [
      [
        { x: -1, y: 2 },
        { x: 8, y: 2 },
        { x: 8, y: 6 },
        { x: 16, y: 6 },
        { x: 16, y: 11 },
        { x: 23, y: 11 },
      ],
      [
        { x: -1, y: 11 },
        { x: 5, y: 11 },
        { x: 5, y: 8 },
        { x: 12, y: 8 },
        { x: 12, y: 11 },
        { x: 23, y: 11 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 14,
      seed: 1003,
      pool: WALD_POOL,
      pfade: 2,
      mengenFaktor: 0.85,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 16,
    fallenplaetze: 3,
    startGold: 300,
    lives: 20,
    staerke: 1.5,
    waveInterval: 20,
    albtraumMutator: 'teuer',
    fluessigAnteil: 0.07,
  }),
  erzeugeLevel({
    id: 'level-04',
    name: 'Wurzelgrund',
    region: 'wald',
    breite: 22,
    hoehe: 13,
    seed: 104,
    paths: [
      [
        { x: -1, y: 6 },
        { x: 3, y: 6 },
        { x: 3, y: 2 },
        { x: 9, y: 2 },
        { x: 9, y: 10 },
        { x: 14, y: 10 },
        { x: 14, y: 3 },
        { x: 19, y: 3 },
        { x: 19, y: 8 },
        { x: 23, y: 8 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 14,
      seed: 1004,
      pool: WALD_POOL,
      pfade: 1,
      boss: 'waldwaechter',
      bossBegleitung: [
        { enemyId: 'krabbler', count: 14 },
        { enemyId: 'moderling', count: 8 },
      ],
    }),
    bauplaetze: 18,
    fallenplaetze: 4,
    startGold: 320,
    lives: 20,
    staerke: 1.55,
    waveInterval: 20,
    albtraumMutator: 'zaeh',
    fluessigAnteil: 0.05,
  }),
  erzeugeLevel({
    id: 'level-05',
    name: 'Basaltstege',
    region: 'glut',
    breite: 22,
    hoehe: 13,
    seed: 105,
    paths: [
      [
        { x: -1, y: 10 },
        { x: 4, y: 10 },
        { x: 4, y: 4 },
        { x: 10, y: 4 },
        { x: 10, y: 10 },
        { x: 16, y: 10 },
        { x: 16, y: 3 },
        { x: 23, y: 3 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 16,
      seed: 1005,
      pool: GLUT_POOL,
      pfade: 1,
      mengenFaktor: 0.9,
      boss: '',
      bossBegleitung: [],
    }),
    // Die schmalen Stege macht der Verlauf des Weges, nicht ein Mangel an
    // Bauplaetzen. Mit sechzehn Plaetzen war diese Karte die einzige, auf der
    // die Zahl gegenueber der vorigen sank - und damit eine Wand, durch die
    // kein Loadout kam.
    bauplaetze: 18,
    fallenplaetze: 4,
    startGold: 450,
    lives: 20,
    staerke: 0.82,
    waveInterval: 19,
    albtraumMutator: 'kurzsichtig',
    fluessigAnteil: 0.16,
  }),
  erzeugeLevel({
    id: 'level-06',
    name: 'Aschewind',
    region: 'glut',
    breite: 24,
    hoehe: 14,
    seed: 106,
    paths: [
      [
        { x: -1, y: 7 },
        { x: 6, y: 7 },
        { x: 6, y: 2 },
        { x: 13, y: 2 },
        { x: 13, y: 8 },
        { x: 19, y: 8 },
        { x: 25, y: 8 },
      ],
      [
        { x: -1, y: 12 },
        { x: 9, y: 12 },
        { x: 9, y: 10 },
        { x: 17, y: 10 },
        { x: 17, y: 12 },
        { x: 25, y: 12 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 16,
      seed: 1006,
      pool: GLUT_POOL_LUFT,
      pfade: 2,
      mengenFaktor: 0.85,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 18,
    fallenplaetze: 4,
    startGold: 440,
    lives: 20,
    staerke: 0.95,
    waveInterval: 19,
    albtraumMutator: 'duerre',
    fluessigAnteil: 0.12,
  }),
  erzeugeLevel({
    id: 'level-07',
    name: 'Schmelzkessel',
    region: 'glut',
    breite: 22,
    hoehe: 13,
    seed: 107,
    paths: [
      [
        { x: -1, y: 3 },
        { x: 5, y: 3 },
        { x: 5, y: 9 },
        { x: 11, y: 9 },
        { x: 11, y: 3 },
        { x: 17, y: 3 },
        { x: 17, y: 10 },
        { x: 23, y: 10 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 18,
      seed: 1007,
      pool: GLUT_POOL_LUFT,
      pfade: 1,
      boss: 'schmelzherz',
      bossBegleitung: [
        { enemyId: 'glutgeist', count: 8 },
        { enemyId: 'aschefalter', count: 10 },
      ],
    }),
    bauplaetze: 20,
    fallenplaetze: 4,
    startGold: 470,
    lives: 20,
    staerke: 0.9,
    waveInterval: 19,
    albtraumMutator: 'gepanzert',
    fluessigAnteil: 0.17,
  }),
  erzeugeLevel({
    id: 'level-08',
    name: 'Wandelpfad',
    region: 'leere',
    breite: 24,
    hoehe: 14,
    seed: 108,
    paths: [
      [
        { x: -1, y: 4 },
        { x: 7, y: 4 },
        { x: 7, y: 10 },
        { x: 13, y: 10 },
        { x: 13, y: 4 },
        { x: 19, y: 4 },
        { x: 19, y: 11 },
        { x: 25, y: 11 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 20,
      seed: 1008,
      pool: LEERE_POOL,
      pfade: 1,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 20,
    fallenplaetze: 4,
    startGold: 500,
    lives: 20,
    staerke: 0.78,
    waveInterval: 18,
    albtraumMutator: 'hetze',
    fluessigAnteil: 0.14,
  }),
  erzeugeLevel({
    id: 'level-09',
    name: 'Dreifach',
    region: 'leere',
    breite: 26,
    hoehe: 15,
    seed: 109,
    paths: [
      [
        { x: -1, y: 2 },
        { x: 10, y: 2 },
        { x: 10, y: 6 },
        { x: 27, y: 6 },
      ],
      [
        { x: -1, y: 7 },
        { x: 6, y: 7 },
        { x: 6, y: 12 },
        { x: 16, y: 12 },
        { x: 27, y: 12 },
      ],
      [
        { x: -1, y: 13 },
        { x: 4, y: 13 },
        { x: 4, y: 9 },
        { x: 14, y: 9 },
        { x: 14, y: 13 },
        { x: 27, y: 13 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 20,
      seed: 1009,
      pool: LEERE_POOL,
      pfade: 3,
      mengenFaktor: 0.6,
      boss: '',
      bossBegleitung: [],
    }),
    bauplaetze: 22,
    fallenplaetze: 5,
    startGold: 560,
    lives: 20,
    staerke: 0.66,
    waveInterval: 18,
    albtraumMutator: 'teuer',
    fluessigAnteil: 0.1,
  }),
  erzeugeLevel({
    id: 'level-10',
    name: 'Der Schlund',
    region: 'leere',
    breite: 24,
    hoehe: 14,
    seed: 110,
    paths: [
      [
        { x: -1, y: 7 },
        { x: 4, y: 7 },
        { x: 4, y: 2 },
        { x: 11, y: 2 },
        { x: 11, y: 12 },
        { x: 17, y: 12 },
        { x: 17, y: 5 },
        { x: 25, y: 5 },
      ],
      [
        { x: -1, y: 12 },
        { x: 7, y: 12 },
        { x: 7, y: 9 },
        { x: 14, y: 9 },
        { x: 14, y: 12 },
        { x: 25, y: 12 },
      ],
    ],
    waves: erzeugeWellen({
      anzahl: 25,
      seed: 1010,
      pool: LEERE_POOL,
      pfade: 2,
      mengenFaktor: 0.85,
      boss: 'verschlinger',
      bossBegleitung: [
        { enemyId: 'leerenbrut', count: 12 },
        { enemyId: 'rissgaenger', count: 4 },
        { enemyId: 'echo', count: 3 },
      ],
    }),
    bauplaetze: 22,
    fallenplaetze: 5,
    startGold: 640,
    lives: 20,
    staerke: 0.6,
    waveInterval: 18,
    albtraumMutator: 'gepanzert',
    fluessigAnteil: 0.12,
  }),
];

export const LEVEL_REIHENFOLGE: readonly string[] = LEVEL_DEFS.map((level) => level.id);
