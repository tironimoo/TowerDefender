/**
 * Karte eins, vollstaendig aus Eiern und Wuersten.
 *
 * Die Modelldaten des Spiels sind Listen achsenparalleler Quader. Genau das
 * ist der Grund, warum die Welt nach Minecraft aussieht, und kein Material
 * und kein Licht aendert daran etwas. Hier stehen dieselben Motive noch
 * einmal, gebaut aus den beiden Grundkoerpern, die der Huellenbau seit
 * kurzem ausserdem kennt.
 *
 * Drei Regeln haben alle Modelle gemeinsam, und sie sind wichtiger als jede
 * einzelne Form:
 *
 *  - Nichts ist symmetrisch. Kein Auge sitzt genau so hoch wie das andere,
 *    kein Bein ist genau so dick. Eine von Hand geknetete Figur ist das nie,
 *    und das Auge merkt es noch vor der Form.
 *  - Der Kopf ist zu gross und der Koerper zu klein. Das ist der Griff, mit
 *    dem Knetfiguren ihren Ausdruck bekommen.
 *  - Die Farben sind gebrochen. Reine Farben gibt es in Knete nicht; jede
 *    hat einen Anteil Grau darin.
 *
 * Gebaut wird in Voxeln wie ueberall, damit die Groessen zu den vorhandenen
 * Modellen passen. Die Spiellogik sieht davon nichts.
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

// --- Requisiten ------------------------------------------------------------

const BAUM: RohModell = {
  id: 'prop_baum',
  parts: [
    {
      name: 'stamm',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 1.5, 0], [11, 4, 10], '#6b5236', { grain: 0.1 }),
        wurst([0.4, 9, -0.3], [5.5, 18, 5], '#7a5f3e', 'y', { grain: 0.09 }),
      ],
    },
    {
      name: 'krone',
      pivot: [0, 0, 0],
      bob: { amp: 0.22, phase: 0 },
      boxes: [
        ei([0, 23, 0], [21, 15, 19], '#5c8a3e', { grain: 0.14 }),
        ei([-6.5, 27.5, 3], [14, 12, 13], '#679a45', { grain: 0.14 }),
        ei([6, 26, -3.5], [12.5, 11, 12], '#537f38', { grain: 0.14 }),
        ei([1, 18.5, 6], [10, 8, 9], '#4e7834', { grain: 0.13 }),
      ],
    },
  ],
};

const BUSCH: RohModell = {
  id: 'prop_busch',
  parts: [
    {
      name: 'busch',
      pivot: [0, 0, 0],
      bob: { amp: 0.18, phase: 1.1 },
      boxes: [
        ei([0, 4.5, 0], [14, 9, 13], '#54803a', { grain: 0.15 }),
        ei([-4.5, 6.5, 2], [9, 8, 8], '#619242', { grain: 0.15 }),
        ei([4, 6, -2.5], [8, 7, 7.5], '#4a7333', { grain: 0.15 }),
        ei([1, 1.5, 0], [12, 3, 11], '#5e4a33', { grain: 0.1 }),
      ],
    },
  ],
};

const FELS: RohModell = {
  id: 'prop_fels',
  parts: [
    {
      name: 'fels',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 4, 0], [15, 9, 13], '#8d949b', { grain: 0.12 }),
        ei([5, 2.5, 3], [8, 6, 7], '#7c838a', { grain: 0.12 }),
        ei([-4.5, 2, -2], [7, 5, 6.5], '#99a0a6', { grain: 0.12 }),
        ei([1, 8, 1], [6, 4, 5], '#a3aab0', { grain: 0.1 }),
      ],
    },
  ],
};

const FACKEL: RohModell = {
  id: 'prop_fackel',
  parts: [
    {
      name: 'stiel',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 1, 0], [7, 2.5, 7], '#6d5a44', { grain: 0.09 }),
        // Leicht schief: ein gerade in den Boden gestecktes Stoeckchen sieht
        // gestellt aus, ein schiefes sieht hineingesteckt aus.
        wurst([0.6, 8, 0.4], [2.6, 16, 2.6], '#7c6247', 'y', { grain: 0.1 }),
      ],
    },
    {
      name: 'flamme',
      pivot: [0, 0, 0],
      bob: { amp: 0.5, phase: 0.7 },
      boxes: [
        ei([1.1, 17, 0.8], [5, 6.5, 5], '#ffb648', { glow: 1.4 }),
        ei([1.1, 19.5, 0.8], [3, 4, 3], '#fff0c0', { glow: 2.2 }),
      ],
    },
  ],
};

// --- Gegner ----------------------------------------------------------------

/** Moderling: der Stolperer. Kopf zu gross, Beine zu kurz. */
const MODERLING: RohModell = {
  id: 'moderling',
  parts: [
    {
      name: 'beinLinks',
      pivot: [-3, 11, 0],
      swing: { axis: 'x', amp: 0.45, phase: 0 },
      boxes: [
        wurst([-3, 6, 0], [5.5, 12, 5.5], '#4e5a3c'),
        ei([-3.2, 1.5, 1.5], [7, 4, 9], '#3d4630'),
      ],
    },
    {
      name: 'beinRechts',
      pivot: [3, 11, 0],
      swing: { axis: 'x', amp: 0.45, phase: Math.PI },
      boxes: [
        wurst([3, 6, 0], [5.2, 12, 5.2], '#4e5a3c'),
        ei([3.1, 1.5, 1.4], [7, 4, 9], '#3d4630'),
      ],
    },
    {
      name: 'rumpf',
      pivot: [0, 12, 0],
      bob: { amp: 0.4, phase: Math.PI / 2 },
      boxes: [
        ei([0, 16, 0], [15, 14, 12], '#6f8a4e', { grain: 0.13 }),
        ei([0.3, 26, 0.5], [18, 16, 16], '#7d9857', { grain: 0.13 }),
        ei([0, 24.5, 7.5], [9.5, 7.5, 7.5], '#748c52', { grain: 0.12 }),
        ei([-4.3, 29, 5.5], [6.5, 7.5, 6], '#f2efe2', { grain: 0.04 }),
        ei([4.5, 29.2, 5.5], [6, 7, 5.5], '#f2efe2', { grain: 0.04 }),
        ei([-4.4, 29, 7.8], [3, 3.4, 3], '#20201a', { grain: 0.02 }),
        ei([4.6, 29.2, 7.6], [2.8, 3.2, 2.8], '#20201a', { grain: 0.02 }),
        // Moos auf dem Kopf statt Haaren.
        ei([-2, 33.5, -1], [8, 4, 7], '#4a6b35', { grain: 0.16 }),
        ei([4, 32.8, 1], [6, 3.5, 5.5], '#55793c', { grain: 0.16 }),
      ],
    },
    {
      name: 'armLinks',
      pivot: [-7.5, 20, 0],
      swing: { axis: 'x', amp: 0.36, phase: Math.PI },
      boxes: [wurst([-8, 15, 1], [4.5, 11, 4.5], '#65804a')],
    },
    {
      name: 'armRechts',
      pivot: [7.5, 20, 0],
      swing: { axis: 'x', amp: 0.36, phase: 0 },
      boxes: [wurst([7.9, 15, 1], [4.3, 11, 4.3], '#65804a')],
    },
  ],
};

/** Krabbler: flach, vierbeinig, Augen oben drauf. */
const KRABBLER: RohModell = {
  id: 'krabbler',
  parts: [
    {
      name: 'beinVorn',
      pivot: [0, 7, 4],
      swing: { axis: 'z', amp: 0.4, phase: 0 },
      boxes: [
        wurst([-6.5, 4, 4], [3.5, 9, 3.5], '#5a4536'),
        wurst([6.5, 4, 4], [3.5, 9, 3.5], '#5a4536'),
      ],
    },
    {
      name: 'beinHinten',
      pivot: [0, 7, -4],
      swing: { axis: 'z', amp: 0.4, phase: Math.PI },
      boxes: [
        wurst([-6, 4, -4.5], [3.3, 9, 3.3], '#5a4536'),
        wurst([6.2, 4, -4.5], [3.3, 9, 3.3], '#5a4536'),
      ],
    },
    {
      name: 'panzer',
      pivot: [0, 8, 0],
      bob: { amp: 0.5, phase: 0 },
      boxes: [
        ei([0, 10, 0], [17, 10, 24], '#7b5f42', { grain: 0.13 }),
        ei([0, 13, -3], [13, 8, 14], '#8d6e4c', { grain: 0.13 }),
        ei([0.5, 9, 12], [11, 8, 9], '#6f5539', { grain: 0.12 }),
        ei([-3.4, 12, 14], [4.5, 5, 4.5], '#f2efe2', { grain: 0.04 }),
        ei([3.6, 12.3, 14], [4.2, 4.8, 4.2], '#f2efe2', { grain: 0.04 }),
        ei([-3.5, 12, 15.8], [2.2, 2.5, 2.2], '#20201a', { grain: 0.02 }),
        ei([3.7, 12.3, 15.6], [2, 2.3, 2], '#20201a', { grain: 0.02 }),
        // Stacheln auf dem Ruecken, unterschiedlich lang.
        ei([-4, 17, -2], [4, 6, 4], '#5c4632'),
        ei([3, 17.5, -5], [3.6, 7, 3.6], '#5c4632'),
        ei([0, 16.5, 3], [3.4, 5, 3.4], '#5c4632'),
      ],
    },
  ],
};

// --- Tuerme ----------------------------------------------------------------

/**
 * Die Tuerme entstehen aus einer Vorschrift statt aus vier gezeichneten
 * Fassungen. Jede Stufe legt etwas dazu, und das ist auch spielerisch die
 * richtige Aussage: ein ausgebauter Turm ist derselbe Turm mit mehr daran.
 */
function sockelUndSchaft(stufe: number, holz: string, stein: string): RohKasten[] {
  const kaesten: RohKasten[] = [
    ei([0, 2, 0], [20 + stufe, 5, 19 + stufe], stein, { grain: 0.1 }),
    ei([0.5, 5, -0.4], [16, 4, 15], '#adb3b8', { grain: 0.1 }),
    wurst([-5, 11, -5], [4, 14, 4], holz, 'y', { grain: 0.09 }),
    wurst([5.2, 11, -4.8], [4, 14, 4], holz, 'y', { grain: 0.09 }),
    wurst([-4.8, 11, 5.1], [4, 14, 4], holz, 'y', { grain: 0.09 }),
    wurst([5, 11, 5], [4, 14, 4], holz, 'y', { grain: 0.09 }),
    ei([0, 18.5, 0], [19, 4, 18], holz, { grain: 0.1 }),
  ];
  if (stufe >= 1) kaesten.push(wurst([0, 12, 0], [17, 3, 3], holz, 'x', { grain: 0.09 }));
  if (stufe >= 2) {
    kaesten.push(ei([-9, 15, -9], [5, 5, 5], stein));
    kaesten.push(ei([9.2, 14.6, 9], [5, 5, 5], stein));
  }
  if (stufe >= 3) {
    kaesten.push(ei([-9, 22, -9], [4.5, 7, 4.5], '#c46a4a', { grain: 0.12 }));
    kaesten.push(ei([9, 21.5, 9], [4.5, 7, 4.5], '#c46a4a', { grain: 0.12 }));
  }
  return kaesten;
}

function armbrustturm(stufe: number): RohModell {
  const kopf: RohKasten[] = [
    ei([0, 23, 0], [13, 7, 12], '#8f6a45', { grain: 0.11 }),
    wurst([0, 25, 3], [16 + stufe * 2, 3, 3], '#6f5334', 'x', { grain: 0.09 }),
    wurst([0, 25, 1], [3, 3, 9], '#7d5f3c', 'z', { grain: 0.09 }),
    ei([0, 27.5, -1], [5, 4, 5], '#a8b0b6'),
  ];
  if (stufe >= 2) kopf.push(wurst([0, 28.5, 3], [13, 2.5, 2.5], '#6f5334', 'x'));
  if (stufe >= 3) {
    kopf.push(ei([0, 31, -1], [4, 5, 4], '#7fd0ff', { glow: 1.1 }));
  }
  return {
    id: `armbrustturm_s${stufe}`,
    parts: [
      { name: 'unterbau', pivot: [0, 0, 0], boxes: sockelUndSchaft(stufe, '#8a6b47', '#949aa1') },
      { name: 'kopf', pivot: [0, 23, 0], boxes: kopf },
    ],
  };
}

function schleuder(stufe: number): RohModell {
  const kopf: RohKasten[] = [
    ei([0, 22.5, 0], [14, 7, 13], '#7d6a52', { grain: 0.11 }),
    // Der Wurfarm, schief nach hinten gelegt.
    wurst([0, 27, -4], [3.5, 12, 3.5], '#6b5539', 'y', { grain: 0.09 }),
    ei([0, 32.5, -5.5], [7, 6, 7], '#8d959b', { grain: 0.1 }),
    wurst([0, 24, 4], [11, 3, 3], '#5f4b33', 'x'),
  ];
  if (stufe >= 1) kopf.push(ei([-6, 25, 2], [4.5, 4.5, 4.5], '#9aa1a8'));
  if (stufe >= 2) kopf.push(ei([6.2, 25.3, 2], [4.5, 4.5, 4.5], '#9aa1a8'));
  if (stufe >= 3) kopf.push(ei([0, 35.5, -5.5], [5, 5, 5], '#ffb64c', { glow: 1.0 }));
  return {
    id: `schleuder_s${stufe}`,
    parts: [
      { name: 'unterbau', pivot: [0, 0, 0], boxes: sockelUndSchaft(stufe, '#7f6444', '#8e949b') },
      { name: 'kopf', pivot: [0, 22.5, 0], boxes: kopf },
    ],
  };
}

/** Alles, was Karte eins braucht, unter den Namen aus dem Spiel. */
export const KNETMODELLE: ReadonlyMap<string, RohModell> = new Map(
  [
    BAUM,
    BUSCH,
    FELS,
    FACKEL,
    MODERLING,
    KRABBLER,
    ...[0, 1, 2, 3].map(armbrustturm),
    ...[0, 1, 2, 3].map(schleuder),
  ].map((m) => [m.id, m]),
);
