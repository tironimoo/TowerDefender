/**
 * Alle Gegner der Welt, aus vier Bauplaenen.
 *
 * Sechzehn Gegner einzeln zu zeichnen waere sechzehnmal dieselbe Arbeit und
 * am Ende sechzehn Figuren, die nicht zusammengehoeren. Stattdessen gibt es
 * hier vier Koerperbauten - Zweibeiner, Krabbler, Flieger und Schwebendes -
 * und jeder Gegner ist eine Einstellung davon: Groesse, Farbe, Hoerner,
 * Augenzahl, Glut in den Fugen.
 *
 * Das hat zwei Wirkungen, und die zweite ist die wichtigere. Erstens ist es
 * weniger Arbeit. Zweitens sehen die Gegner danach wie aus einer Werkstatt
 * aus, und genau das ist der Unterschied zwischen einer Sammlung und einer
 * Welt.
 *
 * Die Panzerung ist ablesbar, ohne dass es jemand erklaeren muss:
 *
 *   leder       weiche Haut, matte Farben
 *   eisen       Platten mit hartem Rand
 *   obsidian    dunkles Gestein mit glimmenden Fugen
 *   aetherisch  hell, koerperlos, mit Randleuchten
 */

import type { RohKasten, RohModell, RohTeil } from './meshbau';

const ei = (
  pos: readonly [number, number, number],
  size: readonly [number, number, number],
  color: string,
  mehr: Partial<RohKasten> = {},
): RohKasten => ({ pos, size, color, art: 'ei', ...mehr });

const wurst = (
  pos: readonly [number, number, number],
  size: readonly [number, number, number],
  color: string,
  achse: 'x' | 'y' | 'z' = 'y',
  mehr: Partial<RohKasten> = {},
): RohKasten => ({ pos, size, color, art: 'wurst', achse, ...mehr });

export interface GegnerBauplan {
  readonly id: string;
  /** Hoehe in Voxeln. Ein Moderling ist 34, ein Koloss ueber 60. */
  readonly groesse: number;
  readonly haut: string;
  readonly bauch: string;
  readonly dunkel: string;
  /** Glut in den Fugen. Null bei allem, was nicht brennt. */
  readonly glut?: string;
  /** Wie viele Augen, und wie gross im Verhaeltnis zum Kopf. */
  readonly augen?: number;
  readonly augenGroesse?: number;
  readonly hoerner?: 'keine' | 'stummel' | 'lang' | 'kranz';
  /** Traegt einen Schild am linken Arm. */
  readonly schild?: string;
  /** Koerperlos: der Rumpf schwebt, es gibt keine Beine. */
  readonly schwebt?: boolean;
  readonly fluegel?: string;
  readonly grain?: number;
}

/** Augen: zwei weisse Kugeln mit dunklem Kern, leicht ungleich. */
function augenPaar(
  hoehe: number,
  tiefe: number,
  breite: number,
  gross: number,
): RohKasten[] {
  const weiss = '#f2efe2';
  const kern = '#1f1d18';
  return [
    ei([-breite, hoehe, tiefe], [gross, gross * 1.15, gross], weiss, { grain: 0.04 }),
    ei([breite + 0.2, hoehe + 0.2, tiefe], [gross * 0.94, gross * 1.08, gross * 0.94], weiss, { grain: 0.04 }),
    ei([-breite, hoehe, tiefe + gross * 0.4], [gross * 0.46, gross * 0.52, gross * 0.46], kern, { grain: 0.02 }),
    ei([breite + 0.2, hoehe + 0.2, tiefe + gross * 0.4], [gross * 0.43, gross * 0.49, gross * 0.43], kern, { grain: 0.02 }),
  ];
}

/** Mehr als zwei Augen, im Bogen ueber den Kopf verteilt. */
function augenReihe(anzahl: number, hoehe: number, tiefe: number, gross: number): RohKasten[] {
  const aus: RohKasten[] = [];
  for (let i = 0; i < anzahl; i++) {
    const t = anzahl === 1 ? 0 : (i / (anzahl - 1)) * 2 - 1;
    const x = t * 5.5;
    const y = hoehe + (1 - t * t) * 1.6 + (i % 2) * 0.4;
    aus.push(ei([x, y, tiefe], [gross, gross * 1.12, gross], '#f2efe2', { grain: 0.04 }));
    aus.push(ei([x, y, tiefe + gross * 0.42], [gross * 0.45, gross * 0.5, gross * 0.45], '#1f1d18', { grain: 0.02 }));
  }
  return aus;
}

function hoernerVon(art: GegnerBauplan['hoerner'], oben: number, farbe: string): RohKasten[] {
  if (art === undefined || art === 'keine') return [];
  if (art === 'stummel') {
    return [
      ei([-4.4, oben, -0.6], [4.2, 4.6, 4], farbe),
      ei([4.6, oben - 0.3, -0.8], [4, 4.3, 3.8], farbe),
    ];
  }
  if (art === 'lang') {
    return [
      wurst([-5, oben + 2.5, -1.5], [3.2, 11, 3.2], farbe, 'y'),
      wurst([5.2, oben + 2, -1.8], [3, 10, 3], farbe, 'y'),
    ];
  }
  // Kranz: sechs kurze Zacken im Kreis, absichtlich ungleich lang.
  const aus: RohKasten[] = [];
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2;
    const laenge = 4.5 + (i % 3) * 1.4;
    aus.push(ei([Math.cos(w) * 5.5, oben + laenge * 0.35, Math.sin(w) * 5.5], [3, laenge, 3], farbe));
  }
  return aus;
}

/**
 * Ein Zweibeiner: zwei Beine, ein Rumpf mit Kopf, zwei Arme.
 *
 * Die Masse haengen alle an der Groesse. Ein Koloss ist deshalb kein anderes
 * Modell, sondern derselbe Bauplan mit einer groesseren Zahl - und sieht
 * trotzdem nicht wie ein aufgeblasener Moderling aus, weil Kopf und Beine
 * nicht gleich mitwachsen.
 */
export function zweibeiner(plan: GegnerBauplan): RohModell {
  const s = plan.groesse / 34;
  const beinHoehe = 12 * s;
  const rumpfY = beinHoehe + 4 * s;
  const kopfY = rumpfY + 11 * s;
  const kopfGross = 19 * Math.pow(s, 0.72);
  const grain = plan.grain ?? 0.12;

  const rumpf: RohKasten[] = [
    ei([0, rumpfY, 0], [15 * s, 14 * s, 12 * s], plan.haut, { grain }),
    ei([0, rumpfY - 1 * s, 4.5 * s], [11 * s, 10 * s, 5 * s], plan.bauch, { grain }),
    ei([0.3, kopfY, 0.5], [kopfGross, kopfGross * 0.88, kopfGross * 0.88], plan.haut, { grain }),
    ...(plan.augen === 2 || plan.augen === undefined
      ? augenPaar(kopfY + 2.4, kopfGross * 0.42, kopfGross * 0.23, kopfGross * 0.35)
      : augenReihe(plan.augen, kopfY + 2, kopfGross * 0.42, kopfGross * 0.28)),
    ...hoernerVon(plan.hoerner, kopfY + kopfGross * 0.5, plan.dunkel),
  ];
  if (plan.glut !== undefined) {
    rumpf.push(ei([0, rumpfY + 1 * s, 5.5 * s], [7 * s, 4 * s, 3 * s], plan.glut, { glow: 1.3 }));
    rumpf.push(ei([-3 * s, rumpfY + 6 * s, 5 * s], [3 * s, 2.5 * s, 2 * s], plan.glut, { glow: 1.1 }));
  }

  const teile: RohTeil[] = [
    {
      name: 'beinLinks',
      pivot: [-3 * s, beinHoehe, 0],
      swing: { axis: 'x', amp: 0.45, phase: 0 },
      boxes: [
        wurst([-3 * s, beinHoehe * 0.5, 0], [5.5 * s, beinHoehe, 5.5 * s], plan.dunkel),
        ei([-3.2 * s, 1.5 * s, 1.5 * s], [7 * s, 4 * s, 9 * s], plan.dunkel),
      ],
    },
    {
      name: 'beinRechts',
      pivot: [3 * s, beinHoehe, 0],
      swing: { axis: 'x', amp: 0.45, phase: Math.PI },
      boxes: [
        wurst([3 * s, beinHoehe * 0.5, 0], [5.2 * s, beinHoehe, 5.2 * s], plan.dunkel),
        ei([3.1 * s, 1.5 * s, 1.4 * s], [7 * s, 4 * s, 9 * s], plan.dunkel),
      ],
    },
    { name: 'rumpf', pivot: [0, rumpfY, 0], bob: { amp: 0.4, phase: Math.PI / 2 }, boxes: rumpf },
    {
      name: 'armLinks',
      pivot: [-7.5 * s, rumpfY + 4 * s, 0],
      swing: { axis: 'x', amp: 0.36, phase: Math.PI },
      boxes: [
        wurst([-8 * s, rumpfY - 1 * s, 1 * s], [4.5 * s, 11 * s, 4.5 * s], plan.haut),
        ...(plan.schild === undefined
          ? []
          : [ei([-10.5 * s, rumpfY - 1 * s, 3 * s], [3 * s, 15 * s, 13 * s], plan.schild, { grain: 0.08 })]),
      ],
    },
    {
      name: 'armRechts',
      pivot: [7.5 * s, rumpfY + 4 * s, 0],
      swing: { axis: 'x', amp: 0.36, phase: 0 },
      boxes: [wurst([7.9 * s, rumpfY - 1 * s, 1 * s], [4.3 * s, 11 * s, 4.3 * s], plan.haut)],
    },
  ];
  return { id: plan.id, parts: teile };
}

/** Ein Krabbler: flach, vier Beine, Augen vorn oben. */
export function krabbler(plan: GegnerBauplan): RohModell {
  const s = plan.groesse / 24;
  const grain = plan.grain ?? 0.12;
  const panzer: RohKasten[] = [
    ei([0, 10 * s, 0], [17 * s, 10 * s, 24 * s], plan.haut, { grain }),
    ei([0, 13 * s, -3 * s], [13 * s, 8 * s, 14 * s], plan.bauch, { grain }),
    ei([0.5 * s, 9 * s, 12 * s], [11 * s, 8 * s, 9 * s], plan.dunkel, { grain }),
    ...(plan.augen !== undefined && plan.augen > 2
      ? augenReihe(plan.augen, 12 * s, 14 * s, 3.2 * s)
      : augenPaar(12 * s, 14 * s, 3.5 * s, 4.4 * s)),
  ];
  for (let i = 0; i < 3; i++) {
    panzer.push(
      ei([(i - 1) * 3.6 * s, (16.5 + i * 0.4) * s, (-2 + i * 2.5) * s], [3.6 * s, (5 + i) * s, 3.6 * s], plan.dunkel),
    );
  }
  if (plan.glut !== undefined) {
    panzer.push(ei([0, 14 * s, 2 * s], [9 * s, 2.5 * s, 8 * s], plan.glut, { glow: 1.2 }));
  }
  return {
    id: plan.id,
    parts: [
      {
        name: 'beinVorn',
        pivot: [0, 7 * s, 4 * s],
        swing: { axis: 'z', amp: 0.4, phase: 0 },
        boxes: [
          wurst([-6.5 * s, 4 * s, 4 * s], [3.5 * s, 9 * s, 3.5 * s], plan.dunkel),
          wurst([6.5 * s, 4 * s, 4 * s], [3.5 * s, 9 * s, 3.5 * s], plan.dunkel),
        ],
      },
      {
        name: 'beinHinten',
        pivot: [0, 7 * s, -4 * s],
        swing: { axis: 'z', amp: 0.4, phase: Math.PI },
        boxes: [
          wurst([-6 * s, 4 * s, -4.5 * s], [3.3 * s, 9 * s, 3.3 * s], plan.dunkel),
          wurst([6.2 * s, 4 * s, -4.5 * s], [3.3 * s, 9 * s, 3.3 * s], plan.dunkel),
        ],
      },
      { name: 'panzer', pivot: [0, 8 * s, 0], bob: { amp: 0.5, phase: 0 }, boxes: panzer },
    ],
  };
}

/** Ein Flieger: Rumpf in der Luft, zwei schlagende Fluegel. */
export function flieger(plan: GegnerBauplan): RohModell {
  const s = plan.groesse / 26;
  const grain = plan.grain ?? 0.13;
  const fluegel = plan.fluegel ?? plan.bauch;
  const rumpf: RohKasten[] = [
    ei([0, 8 * s, 0], [9 * s, 11 * s, 13 * s], plan.haut, { grain }),
    ei([0, 13 * s, 3 * s], [10 * s, 9 * s, 9 * s], plan.haut, { grain }),
    ...augenPaar(14 * s, 5 * s, 2.6 * s, 3.8 * s),
    ei([0, 3 * s, -4 * s], [4 * s, 6 * s, 8 * s], plan.dunkel),
  ];
  if (plan.glut !== undefined) {
    rumpf.push(ei([0, 6 * s, 0], [6 * s, 4 * s, 9 * s], plan.glut, { glow: 1.5 }));
  }
  const schwinge = (seite: number, phase: number): RohTeil => ({
    name: seite < 0 ? 'fluegelLinks' : 'fluegelRechts',
    pivot: [seite * 4 * s, 10 * s, 0],
    swing: { axis: 'z', amp: 0.75, phase },
    boxes: [
      ei([seite * 12 * s, 11 * s, 1 * s], [18 * s, 2.5 * s, 14 * s], fluegel, { grain: 0.16 }),
      ei([seite * 17 * s, 12 * s, -4 * s], [12 * s, 2 * s, 9 * s], fluegel, { grain: 0.16 }),
    ],
  });
  return {
    id: plan.id,
    parts: [
      { name: 'rumpf', pivot: [0, 8 * s, 0], bob: { amp: 1.1, phase: 0 }, boxes: rumpf },
      schwinge(-1, 0),
      schwinge(1, Math.PI),
    ],
    hover: 7,
  };
}

/** Etwas Koerperloses: ein Rumpf ohne Beine, der auf der Stelle wabert. */
export function schweber(plan: GegnerBauplan): RohModell {
  const s = plan.groesse / 30;
  const grain = plan.grain ?? 0.1;
  const leib: RohKasten[] = [
    ei([0, 9 * s, 0], [14 * s, 17 * s, 13 * s], plan.haut, { grain }),
    ei([0.4 * s, 20 * s, 0.6 * s], [16 * s, 14 * s, 14 * s], plan.haut, { grain }),
    // Der Schweif laeuft nach unten aus, statt abzubrechen.
    ei([0, 2 * s, 0], [8 * s, 8 * s, 7 * s], plan.bauch, { grain }),
    ei([0, -3 * s, 0], [4 * s, 6 * s, 3.5 * s], plan.bauch, { grain }),
    ...(plan.augen !== undefined && plan.augen !== 2
      ? augenReihe(plan.augen, 21 * s, 6.5 * s, 3.4 * s)
      : augenPaar(21 * s, 6.5 * s, 4 * s, 4.6 * s)),
    ...hoernerVon(plan.hoerner, 27 * s, plan.dunkel),
  ];
  if (plan.glut !== undefined) {
    leib.push(ei([0, 11 * s, 3 * s], [8 * s, 8 * s, 5 * s], plan.glut, { glow: 1.8 }));
  }
  return {
    id: plan.id,
    parts: [
      { name: 'leib', pivot: [0, 10 * s, 0], bob: { amp: 1.4, phase: 0 }, boxes: leib },
      {
        name: 'armLinks',
        pivot: [-7 * s, 16 * s, 0],
        swing: { axis: 'z', amp: 0.22, phase: 0 },
        boxes: [wurst([-9 * s, 12 * s, 1 * s], [4 * s, 10 * s, 4 * s], plan.haut)],
      },
      {
        name: 'armRechts',
        pivot: [7 * s, 16 * s, 0],
        swing: { axis: 'z', amp: 0.22, phase: Math.PI },
        boxes: [wurst([9.2 * s, 12 * s, 1 * s], [3.8 * s, 10 * s, 3.8 * s], plan.haut)],
      },
    ],
    hover: 5,
  };
}

/**
 * Die sechzehn Gegner als Einstellungen der vier Bauplaene.
 *
 * Die Farben folgen der Panzerung, nicht dem Geschmack: wer Leder traegt, ist
 * matt und erdig, Eisen bekommt einen kalten Grauton, Obsidian ist fast
 * schwarz mit Glut in den Fugen, Aetherisches ist hell und leuchtet am Rand.
 */
export const GEGNER: readonly RohModell[] = [
  zweibeiner({
    id: 'moderling', groesse: 34,
    haut: '#7d9857', bauch: '#6f8a4e', dunkel: '#4e5a3c', hoerner: 'stummel',
  }),
  krabbler({
    id: 'krabbler', groesse: 24,
    haut: '#7b5f42', bauch: '#8d6e4c', dunkel: '#5a4536',
  }),
  zweibeiner({
    id: 'knochenschuetze', groesse: 36,
    haut: '#d8d2c0', bauch: '#c2bba6', dunkel: '#8e8877', hoerner: 'lang', grain: 0.08,
  }),
  zweibeiner({
    id: 'sprengling', groesse: 30,
    haut: '#b8703c', bauch: '#d08a48', dunkel: '#6d4326', glut: '#ffb24a', augen: 3,
  }),
  zweibeiner({
    id: 'magmakoloss', groesse: 62,
    haut: '#3c322e', bauch: '#2a2321', dunkel: '#1d1917', glut: '#ff7a2a', hoerner: 'kranz', grain: 0.16,
  }),
  zweibeiner({
    id: 'kolosssplitter', groesse: 26,
    haut: '#3c322e', bauch: '#2a2321', dunkel: '#1d1917', glut: '#ff7a2a', grain: 0.16,
  }),
  flieger({
    id: 'aschefalter', groesse: 26,
    haut: '#6a5c52', bauch: '#8a7a6c', dunkel: '#463d36', fluegel: '#9b8a7a',
  }),
  schweber({
    id: 'glutgeist', groesse: 32,
    haut: '#7a3418', bauch: '#a8501f', dunkel: '#3a1a0c', glut: '#ff9236', augen: 4,
  }),
  zweibeiner({
    id: 'schildwart', groesse: 38,
    haut: '#8e959c', bauch: '#767d84', dunkel: '#4e545a', schild: '#a7aeb5', grain: 0.08,
  }),
  zweibeiner({
    id: 'schreiter', groesse: 52,
    haut: '#c9c2e8', bauch: '#b0a8d6', dunkel: '#7a6fae', augen: 1, grain: 0.06,
  }),
  krabbler({
    id: 'leerenbrut', groesse: 20,
    haut: '#6a5a94', bauch: '#7d6bab', dunkel: '#463a68', augen: 5,
  }),
  schweber({
    id: 'echo', groesse: 30,
    haut: '#a8b6e8', bauch: '#8e9cd4', dunkel: '#6a76ac', augen: 2, grain: 0.05,
  }),
  zweibeiner({
    id: 'rissgaenger', groesse: 40,
    haut: '#5a4f86', bauch: '#6d6099', dunkel: '#39325c', hoerner: 'kranz', glut: '#c58aff',
  }),
  zweibeiner({
    id: 'waldwaechter', groesse: 58,
    haut: '#5c7a42', bauch: '#6b8a4e', dunkel: '#4a3a28', hoerner: 'kranz', grain: 0.17,
  }),
  schweber({
    id: 'schmelzherz', groesse: 56,
    haut: '#43312c', bauch: '#2c211e', dunkel: '#1a1412', glut: '#ff8a32', augen: 6, grain: 0.16,
  }),
  schweber({
    id: 'verschlinger', groesse: 60,
    haut: '#3d3358', bauch: '#2a2440', dunkel: '#191528', glut: '#b070ff', augen: 7, grain: 0.14,
  }),
];
