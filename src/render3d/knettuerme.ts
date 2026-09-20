/**
 * Alle zwoelf Turmreihen, je vier Ausbaustufen.
 *
 * Auch hier steht die Vorschrift vor der Zeichnung: Sockel und Schaft sind
 * fuer alle gleich und wachsen mit der Stufe, der Kopf macht den Unterschied.
 * Ein ausgebauter Turm ist deshalb sichtbar derselbe Turm mit mehr daran -
 * und nicht ein anderes Modell, das an seine Stelle tritt.
 *
 * Die Farbe sagt, womit der Turm schiesst, ohne dass es jemand erklaeren
 * muss: Holz und Stahl fuer Koerperliches, Kupfer und Glut fuer Feuer,
 * Violett und Kristall fuer Arkanes.
 */

import type { RohKasten, RohModell } from './meshbau';

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

interface Palette {
  readonly trag: string;
  readonly stein: string;
  readonly zier: string;
  readonly leucht: string;
}

const HOLZ: Palette = { trag: '#8a6b47', stein: '#949aa1', zier: '#b8603c', leucht: '#ffd27a' };
const STAHL: Palette = { trag: '#6f7780', stein: '#8e959c', zier: '#3f4952', leucht: '#cfe4ff' };
const KUPFER: Palette = { trag: '#9b5f34', stein: '#8d8378', zier: '#c8763a', leucht: '#ff8a32' };
const ARKAN: Palette = { trag: '#6a5f96', stein: '#8b86a8', zier: '#4a3f76', leucht: '#b48aff' };
const FROST: Palette = { trag: '#6f8296', stein: '#93a3b4', zier: '#4e6070', leucht: '#96dcff' };
const GRUEN: Palette = { trag: '#6f7a4a', stein: '#8e9584', zier: '#4a5c34', leucht: '#9ee06a' };

/**
 * Sockel, vier Stuetzen, Plattform.
 *
 * Wenige Voxel Unterschied je Stufe reichen: das Auge liest Zuwachs vor
 * allem an neuen Teilen, nicht an groesseren.
 */
function unterbau(stufe: number, p: Palette, niedrig = false): RohKasten[] {
  const h = niedrig ? 0.45 : 1;
  const kaesten: RohKasten[] = [
    ei([0, 2, 0], [20 + stufe, 5, 19 + stufe], p.stein, { grain: 0.1 }),
    ei([0.5, 5, -0.4], [16, 4, 15], p.stein, { grain: 0.1 }),
    wurst([-5, 11 * h, -5], [4, 14 * h, 4], p.trag, 'y', { grain: 0.09 }),
    wurst([5.2, 11 * h, -4.8], [4, 14 * h, 4], p.trag, 'y', { grain: 0.09 }),
    wurst([-4.8, 11 * h, 5.1], [4, 14 * h, 4], p.trag, 'y', { grain: 0.09 }),
    wurst([5, 11 * h, 5], [4, 14 * h, 4], p.trag, 'y', { grain: 0.09 }),
    ei([0, 18.5 * h, 0], [19, 4, 18], p.trag, { grain: 0.1 }),
  ];
  if (stufe >= 1) kaesten.push(wurst([0, 12 * h, 0], [17, 3, 3], p.trag, 'x', { grain: 0.09 }));
  if (stufe >= 2) {
    kaesten.push(ei([-9, 15 * h, -9], [5, 5, 5], p.stein));
    kaesten.push(ei([9.2, 14.6 * h, 9], [5, 5, 5], p.stein));
  }
  if (stufe >= 3) {
    kaesten.push(ei([-9, 22 * h, -9], [4.5, 7, 4.5], p.zier, { grain: 0.12 }));
    kaesten.push(ei([9, 21.5 * h, 9], [4.5, 7, 4.5], p.zier, { grain: 0.12 }));
  }
  return kaesten;
}

type KopfBauer = (stufe: number, p: Palette, y: number) => RohKasten[];

function reihe(id: string, p: Palette, kopf: KopfBauer, niedrig = false): RohModell[] {
  const y = niedrig ? 12 : 23;
  return [0, 1, 2, 3].map((stufe) => ({
    id: `${id}_s${stufe}`,
    parts: [
      { name: 'unterbau', pivot: [0, 0, 0] as const, boxes: unterbau(stufe, p, niedrig) },
      { name: 'kopf', pivot: [0, y, 0] as const, boxes: kopf(stufe, p, y) },
    ],
  }));
}

/** Der Sockel, auf dem jeder Kopf sitzt. Spart zwoelfmal dieselbe Zeile. */
function kopfTeller(y: number, p: Palette, breite = 13): RohKasten[] {
  return [ei([0, y, 0], [breite, 7, breite - 1], p.trag, { grain: 0.11 })];
}

const TUERME: readonly RohModell[] = [
  ...reihe('armbrustturm', HOLZ, (stufe, p, y) => [
    ...kopfTeller(y, p),
    wurst([0, y + 2, 3], [16 + stufe * 2, 3, 3], p.zier, 'x', { grain: 0.09 }),
    wurst([0, y + 2, 1], [3, 3, 9], p.trag, 'z', { grain: 0.09 }),
    ei([0, y + 4.5, -1], [5, 4, 5], p.stein),
    ...(stufe >= 2 ? [wurst([0, y + 5.5, 3], [13, 2.5, 2.5], p.zier, 'x')] : []),
    ...(stufe >= 3 ? [ei([0, y + 8, -1], [4, 5, 4], p.leucht, { glow: 1.1 })] : []),
  ]),

  ...reihe('schleuder', HOLZ, (stufe, p, y) => [
    ...kopfTeller(y, p, 14),
    wurst([0, y + 4.5, -4], [3.5, 12, 3.5], p.zier, 'y', { grain: 0.09 }),
    ei([0, y + 10, -5.5], [7, 6, 7], p.stein, { grain: 0.1 }),
    wurst([0, y + 1.5, 4], [11, 3, 3], p.zier, 'x'),
    ...(stufe >= 1 ? [ei([-6, y + 2.5, 2], [4.5, 4.5, 4.5], p.stein)] : []),
    ...(stufe >= 2 ? [ei([6.2, y + 2.8, 2], [4.5, 4.5, 4.5], p.stein)] : []),
    ...(stufe >= 3 ? [ei([0, y + 13, -5.5], [5, 5, 5], p.leucht, { glow: 1 })] : []),
  ]),

  ...reihe('frostturm', FROST, (stufe, p, y) => [
    ...kopfTeller(y, p, 12),
    // Ein Kristallbuschel, bewusst ungleich hoch.
    ei([0, y + 7, 0], [7, 13, 7], p.leucht, { glow: 0.9, grain: 0.05 }),
    ei([-4, y + 5, 2], [5, 9, 5], p.leucht, { glow: 0.7, grain: 0.05 }),
    ei([3.6, y + 4.5, -2], [4.5, 8, 4.5], p.leucht, { glow: 0.7, grain: 0.05 }),
    ...(stufe >= 1 ? [ei([2, y + 9, 3.5], [4, 7, 4], p.leucht, { glow: 0.8 })] : []),
    ...(stufe >= 2 ? [ei([-3, y + 10, -3], [3.6, 6.5, 3.6], p.leucht, { glow: 0.8 })] : []),
    ...(stufe >= 3 ? [ei([0, y + 15, 0], [6, 7, 6], '#ffffff', { glow: 1.6 })] : []),
  ]),

  ...reihe('glutduese', KUPFER, (stufe, p, y) => [
    ...kopfTeller(y, p, 13),
    // Ein Kessel mit Rohr nach vorn.
    ei([0, y + 4, -2], [11, 10, 11], p.trag, { grain: 0.1 }),
    wurst([0, y + 3, 5], [4.5, 12, 4.5], p.zier, 'z', { grain: 0.09 }),
    ei([0, y + 3, 10], [6, 5, 4], p.leucht, { glow: 1.6 }),
    ...(stufe >= 1 ? [ei([-5, y + 6, -3], [4, 6, 4], p.zier)] : []),
    ...(stufe >= 2 ? [wurst([0, y + 9, 3], [3.5, 9, 3.5], p.zier, 'z')] : []),
    ...(stufe >= 3 ? [ei([0, y + 9.5, 7], [4.5, 4, 3.5], p.leucht, { glow: 1.8 })] : []),
  ]),

  ...reihe('balliste', STAHL, (stufe, p, y) => [
    ...kopfTeller(y, p, 15),
    wurst([0, y + 3, 0], [4.5, 26 + stufe * 3, 4.5], p.trag, 'z', { grain: 0.09 }),
    wurst([0, y + 4, -2], [22 + stufe * 2, 3.5, 3.5], p.zier, 'x', { grain: 0.09 }),
    ei([0, y + 3, 13], [5, 5, 6], p.stein),
    ...(stufe >= 1 ? [ei([-9, y + 4.5, -2], [4, 5, 4], p.stein)] : []),
    ...(stufe >= 2 ? [ei([9, y + 4.5, -2], [4, 5, 4], p.stein)] : []),
    ...(stufe >= 3 ? [ei([0, y + 8, 4], [4, 4, 4], p.leucht, { glow: 1.2 })] : []),
  ]),

  ...reihe('blitzspule', ARKAN, (stufe, p, y) => [
    ...kopfTeller(y, p, 12),
    // Gestapelte Ringe, nach oben schmaler.
    ei([0, y + 4, 0], [13, 3, 13], p.zier, { grain: 0.08 }),
    ei([0, y + 7, 0], [10.5, 3, 10.5], p.zier, { grain: 0.08 }),
    ei([0, y + 10, 0], [8, 3, 8], p.zier, { grain: 0.08 }),
    ei([0, y + 14, 0], [6.5, 6.5, 6.5], p.leucht, { glow: 1.7 }),
    ...(stufe >= 1 ? [ei([0, y + 12.5, 0], [6, 2.5, 6], p.zier)] : []),
    ...(stufe >= 2 ? [ei([-6, y + 8, 4], [3, 8, 3], p.leucht, { glow: 1.1 })] : []),
    ...(stufe >= 3 ? [ei([5.5, y + 8.5, -4], [3, 8, 3], p.leucht, { glow: 1.1 })] : []),
  ]),

  ...reihe(
    'ambossfalle',
    STAHL,
    (stufe, p, y) => [
      // Ein Amboss, der flach auf dem Weg liegt.
      ei([0, y + 1, 0], [17, 6, 13], p.trag, { grain: 0.1 }),
      ei([0, y + 4.5, 0], [13, 5, 10], p.zier, { grain: 0.09 }),
      wurst([7, y + 4.5, 0], [8, 5, 5], p.zier, 'x'),
      ...(stufe >= 1 ? [ei([-7, y + 5, 0], [5, 5, 6], p.stein)] : []),
      ...(stufe >= 2 ? [ei([0, y + 7.5, 0], [8, 3, 7], p.stein)] : []),
      ...(stufe >= 3 ? [ei([0, y + 10, 0], [4, 4, 4], p.leucht, { glow: 1.2 })] : []),
    ],
    true,
  ),

  ...reihe('netzwerfer', GRUEN, (stufe, p, y) => [
    ...kopfTeller(y, p, 13),
    // Eine Trommel mit Seil und zwei Zinken.
    wurst([0, y + 5, 0], [12, 11, 12], p.trag, 'x', { grain: 0.1 }),
    wurst([-5, y + 5, 6], [2.5, 9, 2.5], p.zier, 'z'),
    wurst([5, y + 5, 6], [2.5, 9, 2.5], p.zier, 'z'),
    ...(stufe >= 1 ? [ei([0, y + 5, 9], [10, 3, 3], p.leucht, { glow: 0.7 })] : []),
    ...(stufe >= 2 ? [ei([0, y + 11, 0], [8, 4, 8], p.stein)] : []),
    ...(stufe >= 3 ? [ei([0, y + 14, 2], [4.5, 4.5, 4.5], p.leucht, { glow: 1.1 })] : []),
  ]),

  ...reihe('kolbenstoss', STAHL, (stufe, p, y) => [
    ...kopfTeller(y, p, 13),
    // Ein liegender Zylinder mit Stempel nach vorn.
    wurst([0, y + 4, -1], [10, 14, 10], p.trag, 'z', { grain: 0.1 }),
    wurst([0, y + 4, 8], [5, 10, 5], p.stein, 'z'),
    ei([0, y + 4, 12.5], [9, 8, 3.5], p.zier, { grain: 0.09 }),
    ...(stufe >= 1 ? [ei([-6, y + 6, -3], [3.5, 8, 3.5], p.zier)] : []),
    ...(stufe >= 2 ? [ei([6, y + 6, -3], [3.5, 8, 3.5], p.zier)] : []),
    ...(stufe >= 3 ? [ei([0, y + 10, 4], [4, 4, 4], p.leucht, { glow: 1.2 })] : []),
  ]),

  ...reihe('leuchtfeuer', KUPFER, (stufe, p, y) => [
    ...kopfTeller(y, p, 12),
    // Eine Feuerschale.
    ei([0, y + 5, 0], [15, 7, 15], p.trag, { grain: 0.11 }),
    ei([0, y + 8, 0], [11, 5, 11], p.leucht, { glow: 1.9 }),
    ...(stufe >= 1 ? [ei([0, y + 11, 0], [7, 6, 7], '#ffe3a8', { glow: 2.2 })] : []),
    ...(stufe >= 2 ? [ei([-7, y + 7, 5], [3.5, 7, 3.5], p.zier)] : []),
    ...(stufe >= 3 ? [ei([7, y + 7, -5], [3.5, 7, 3.5], p.zier)] : []),
  ]),

  ...reihe('alchemieturm', GRUEN, (stufe, p, y) => [
    ...kopfTeller(y, p, 13),
    // Ein Kolben: bauchig unten, Hals oben.
    ei([0, y + 6, 0], [13, 12, 13], p.stein, { grain: 0.07 }),
    ei([0, y + 5, 0], [10, 8, 10], p.leucht, { glow: 1.1 }),
    wurst([0, y + 13, 0], [5, 8, 5], p.stein, 'y', { grain: 0.07 }),
    ...(stufe >= 1 ? [ei([0, y + 17, 0], [6.5, 4, 6.5], p.leucht, { glow: 1.4 })] : []),
    ...(stufe >= 2 ? [ei([-7.5, y + 6, 3], [4, 9, 4], p.leucht, { glow: 0.9 })] : []),
    ...(stufe >= 3 ? [ei([7.5, y + 6.5, -3], [4, 9, 4], p.leucht, { glow: 0.9 })] : []),
  ]),

  ...reihe('spaehturm', HOLZ, (stufe, p, y) => [
    ...kopfTeller(y, p, 11),
    // Ein Ausguck mit Linse.
    wurst([0, y + 8, 0], [4, 12, 4], p.trag, 'y', { grain: 0.09 }),
    ei([0, y + 15, 0], [13, 5, 13], p.trag, { grain: 0.1 }),
    wurst([0, y + 17, 4], [4.5, 9, 4.5], p.stein, 'z'),
    ei([0, y + 17, 8.5], [5.5, 5.5, 3], p.leucht, { glow: 1.3 }),
    ...(stufe >= 1 ? [ei([-5, y + 18, -3], [3.5, 6, 3.5], p.zier)] : []),
    ...(stufe >= 2 ? [ei([5, y + 18.5, -3], [3.5, 6, 3.5], p.zier)] : []),
    ...(stufe >= 3 ? [ei([0, y + 21, 0], [4.5, 5, 4.5], p.leucht, { glow: 1.5 })] : []),
  ]),
];

export { TUERME };
