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
import { GEGNER } from './knetgegner';
import { TUERME } from './knettuerme';
import { BAUTEN } from './knetbauten';

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

// --- Weitere Requisiten ----------------------------------------------------

const BASALTSAEULE: RohModell = {
  id: 'prop_basaltsaeule',
  parts: [
    {
      name: 'saeule',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 2, 0], [14, 5, 13], '#3a2f2c', { grain: 0.14 }),
        wurst([0.5, 13, -0.5], [9, 22, 8.5], '#4a3c38', 'y', { grain: 0.15 }),
        wurst([-4, 9, 3], [6, 14, 6], '#403330', 'y', { grain: 0.15 }),
        ei([1, 24, 0], [8, 5, 7.5], '#57443f', { grain: 0.13 }),
      ],
    },
  ],
};

const GLUTSTEIN: RohModell = {
  id: 'prop_glutstein',
  parts: [
    {
      name: 'stein',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 4, 0], [15, 9, 14], '#332926', { grain: 0.15 }),
        ei([4.5, 2.5, 3], [8, 6, 7], '#2a2320', { grain: 0.15 }),
        // Die Glut sitzt in den Fugen, nicht auf der Oberflaeche.
        ei([0, 5, 2], [7, 3.5, 5], '#ff7c2e', { glow: 1.6 }),
        ei([-3, 2.5, -3], [4, 2.5, 3.5], '#ffa04a', { glow: 1.3 }),
      ],
    },
  ],
};

const KRISTALL: RohModell = {
  id: 'prop_kristall',
  parts: [
    {
      name: 'kristall',
      pivot: [0, 0, 0],
      bob: { amp: 0.3, phase: 0.4 },
      boxes: [
        ei([0, 2, 0], [12, 4, 11], '#2e2748', { grain: 0.12 }),
        ei([0, 12, 0], [7, 20, 7], '#a87ce0', { glow: 0.9, grain: 0.05 }),
        ei([-4.5, 8, 2], [5, 13, 5], '#8f66c8', { glow: 0.7, grain: 0.05 }),
        ei([4, 7, -2], [4.5, 11, 4.5], '#b98ff0', { glow: 0.7, grain: 0.05 }),
      ],
    },
  ],
};

const TRUEMMER: RohModell = {
  id: 'prop_truemmer',
  parts: [
    {
      name: 'truemmer',
      pivot: [0, 0, 0],
      boxes: [
        ei([0, 2.5, 0], [17, 5, 15], '#6e6558', { grain: 0.14 }),
        wurst([-3, 6, 2], [5, 12, 5], '#7d7264', 'y', { grain: 0.13 }),
        wurst([5, 4, -2], [11, 4.5, 4.5], '#655c50', 'x', { grain: 0.13 }),
        ei([2, 8, -3], [6, 4, 5], '#857a6b', { grain: 0.13 }),
      ],
    },
  ],
};

// --- Geschosse -------------------------------------------------------------
// Sie fliegen schnell und sind klein; hier zaehlt nur, dass Farbe und Form
// sofort verraten, welcher Turm geschossen hat.

function geschoss(id: string, kaesten: RohKasten[]): RohModell {
  return { id, parts: [{ name: 'kopf', pivot: [0, 0, 0], boxes: kaesten }] };
}

const GESCHOSSE: readonly RohModell[] = [
  geschoss('schuss_pfeil', [
    wurst([0, 0, 0], [1.6, 7, 1.6], '#8a6b47', 'z'),
    ei([0, 0, 4], [2.2, 2.2, 3], '#c8ccd0'),
  ]),
  geschoss('schuss_bolzen', [
    wurst([0, 0, 0], [2.2, 9, 2.2], '#5f6870', 'z'),
    ei([0, 0, 5.2], [3, 3, 3.6], '#aeb6bd'),
  ]),
  geschoss('schuss_stein', [ei([0, 0, 0], [4.2, 3.8, 4], '#8d949b', { grain: 0.14 })]),
  geschoss('schuss_frost', [
    ei([0, 0, 0], [3.4, 4.6, 3.4], '#96dcff', { glow: 1.5 }),
    ei([1.4, 0.8, 0], [2, 2.6, 2], '#d6f2ff', { glow: 1.2 }),
  ]),
  geschoss('schuss_netz', [
    ei([0, 0, 0], [5.5, 5, 5.5], '#9ee06a', { glow: 0.6 }),
    wurst([0, 0, 0], [7, 1.4, 1.4], '#6f7a4a', 'x'),
  ]),
  geschoss('schuss_blitz', [
    ei([0, 0, 0], [2.8, 2.8, 6], '#b48aff', { glow: 2.1 }),
    ei([0, 1.6, -2.5], [2, 2, 3], '#e0ccff', { glow: 1.8 }),
  ]),
  geschoss('schuss_glut', [
    ei([0, 0, 0], [4.4, 4, 5], '#ff8a32', { glow: 2 }),
    ei([0, 0.6, -2.4], [2.6, 2.4, 3], '#ffd27a', { glow: 1.6 }),
  ]),
  geschoss('schuss_arkan', [
    ei([0, 0, 0], [4.2, 4.2, 4.2], '#c58aff', { glow: 1.9 }),
    ei([0, 0, 0], [6, 1.6, 6], '#8f66c8', { glow: 1.2 }),
  ]),
];

/** Alles, was die Welt braucht, unter den Namen aus dem Spiel. */
export const KNETMODELLE: ReadonlyMap<string, RohModell> = new Map(
  [
    BAUM,
    BUSCH,
    FELS,
    FACKEL,
    BASALTSAEULE,
    GLUTSTEIN,
    KRISTALL,
    TRUEMMER,
    ...GESCHOSSE,
    ...GEGNER,
    ...TUERME,
    ...BAUTEN,
  ].map((m) => [m.id, m]),
);
