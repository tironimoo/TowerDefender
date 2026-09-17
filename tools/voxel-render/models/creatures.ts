/**
 * Die Wesen des Spiels.
 *
 * Zwoelf Gegner und drei Bosse. Wo eine Grundform passt, kommt sie aus
 * bausteine.ts. Wo ein Wesen eine eigene Silhouette braucht, steht es hier
 * ausgeschrieben. Die Silhouette ist wichtiger als das Detail: auf einem
 * Handybildschirm erkennt man die Form, nicht die Textur.
 */

import type { VoxelModel } from '../voxel';
import { box, floater, humanoid, part, quadruped } from './bausteine';
import { GLUT, LEERE, WALD } from './palette';

// --- Waldsenke -------------------------------------------------------------

const moderling = humanoid({
  id: 'moderling',
  skin: '#5f7a46',
  cloth: '#3f4a33',
  accent: '#6b8a50',
  eyes: { color: WALD.augenGelb, glow: 0.5 },
  armsForward: true,
  stride: 0.38,
  bodyProps: [box([0, 17, 2.1], [6, 5, 0.8], '#4a5c38')],
});

const krabbler = quadruped({
  id: 'krabbler',
  body: '#3a2f42',
  legs: '#241d2b',
  accent: '#4a3b55',
  length: 9,
  height: 7,
  width: 8,
  legCount: 6,
  headSize: 5,
  eyes: { color: '#ff5f5f', glow: 0.6 },
});

const knochenschuetze = humanoid({
  id: 'knochenschuetze',
  skin: WALD.knochen,
  cloth: '#cfc9b4',
  accent: WALD.eisen,
  eyes: { color: '#7fd4ff', glow: 0.6 },
  stride: 0.4,
  headProps: [box([0, 31.5, -0.5], [9, 2.5, 9], WALD.eisen)],
  bodyProps: [box([0, 19, 0], [9, 7, 5], WALD.eisen, { grain: 0.06 })],
  handProps: [
    box([6.5, 16, 3], [1.2, 12, 1.2], '#6b4f2a'),
    box([6.5, 16, 3], [1, 1, 5], '#e4dfc9', { grain: 0.04 }),
  ],
});

/** Vierbeiner ohne Arme mit hohem Koerper. Zuendet neben Tuermen. */
const sprengling: VoxelModel = {
  id: 'sprengling',
  parts: [
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        part(
          `bein${sx}${sz}`,
          [sx * 2.5, 5, sz * 2.5],
          [box([sx * 2.5, 2.5, sz * 2.5], [3, 5, 3], '#3d6b31')],
          { swing: { axis: 'x', amp: 0.34, phase: sx * sz > 0 ? 0 : Math.PI } },
        ),
      ),
    ),
    part(
      'rumpf',
      [0, 5, 0],
      [
        box([0, 12, 0], [8, 14, 8], '#4f8a3f'),
        box([0, 9, 4.1], [5, 6, 0.6], '#3f7333', { grain: 0.14 }),
      ],
      { bob: { amp: 0.4, phase: Math.PI / 2 } },
    ),
    part(
      'kopf',
      [0, 19, 0],
      [
        box([0, 23, 0], [9, 8, 9], '#5f9c4a'),
        box([-2, 24, 4.6], [2.5, 2.5, 0.6], '#1b2418', { grain: 0 }),
        box([2, 24, 4.6], [2.5, 2.5, 0.6], '#1b2418', { grain: 0 }),
        box([0, 21, 4.6], [5, 3, 0.6], '#1b2418', { grain: 0 }),
      ],
      { bob: { amp: 0.4, phase: Math.PI / 2 } },
    ),
  ],
};

// --- Glutschlucht ----------------------------------------------------------

/** Schwerer Koloss aus Basalt mit gluehenden Rissen. */
const magmakoloss: VoxelModel = {
  id: 'magmakoloss',
  parts: [
    ...[-1, 1].map((sx) =>
      part(
        `bein${sx}`,
        [sx * 4, 9, 0],
        [
          box([sx * 4, 4.5, 0], [7, 9, 7], GLUT.basalt),
          box([sx * 4, 4.5, 3.6], [4, 5, 0.6], GLUT.magma, { glow: 0.8, grain: 0.05 }),
        ],
        { swing: { axis: 'x', amp: 0.35, phase: sx > 0 ? 0 : Math.PI } },
      ),
    ),
    part(
      'rumpf',
      [0, 9, 0],
      [
        box([0, 17, 0], [16, 16, 11], GLUT.basalt),
        box([0, 17, 5.7], [10, 1.6, 0.6], GLUT.magma, { glow: 0.9, grain: 0.05 }),
        box([0, 13, 5.7], [6, 1.4, 0.6], GLUT.lava, { glow: 0.8, grain: 0.05 }),
        box([-8.5, 17, 0], [1.2, 10, 8], GLUT.lava, { glow: 0.6, grain: 0.08 }),
        box([8.5, 17, 0], [1.2, 10, 8], GLUT.lava, { glow: 0.6, grain: 0.08 }),
      ],
      { bob: { amp: 0.5, phase: Math.PI / 2 } },
    ),
    ...[-1, 1].map((sx) =>
      part(
        `arm${sx}`,
        [sx * 9.5, 24, 0],
        [box([sx * 10, 17, 0], [5, 15, 5], GLUT.basaltHell)],
        { swing: { axis: 'x', amp: 0.3, phase: sx > 0 ? Math.PI : 0 } },
      ),
    ),
    part(
      'kopf',
      [0, 25, 0],
      [
        box([0, 29, 0], [9, 8, 9], GLUT.basaltHell),
        box([-2.2, 29.5, 4.6], [2.4, 2, 0.6], GLUT.glut, { glow: 1, grain: 0 }),
        box([2.2, 29.5, 4.6], [2.4, 2, 0.6], GLUT.glut, { glow: 1, grain: 0 }),
      ],
      { bob: { amp: 0.5, phase: Math.PI / 2 } },
    ),
  ],
};

const aschefalter = floater({
  id: 'aschefalter',
  core: GLUT.magma,
  shell: GLUT.asche,
  glowColor: GLUT.glut,
  size: 7,
  hover: 9,
  wings: { color: '#8f8794', span: 11 },
});

const glutgeist = floater({
  id: 'glutgeist',
  core: GLUT.lava,
  shell: GLUT.russ,
  glowColor: GLUT.glut,
  size: 8,
  hover: 6,
});

const schildwart = humanoid({
  id: 'schildwart',
  skin: GLUT.eisenDunkel,
  cloth: GLUT.basalt,
  accent: GLUT.asche,
  height: 34,
  breite: 10,
  stride: 0.34,
  eyes: { color: GLUT.glut, glow: 0.7 },
  bodyProps: [box([0, 21, 0], [12, 9, 7], GLUT.asche, { grain: 0.06 })],
  handProps: [
    box([8.5, 19, 2], [1.5, 15, 12], '#8f8794', { grain: 0.07 }),
    box([8.5, 19, 2], [1, 8, 8], GLUT.glut, { glow: 0.55, grain: 0.05 }),
  ],
});

// --- Leerlande -------------------------------------------------------------

const schreiter = humanoid({
  id: 'schreiter',
  skin: LEERE.obsidian,
  cloth: LEERE.stein,
  accent: LEERE.steinHell,
  height: 44,
  breite: 7,
  stride: 0.36,
  eyes: { color: LEERE.amethystHell, glow: 1 },
  bodyProps: [box([0, 26, 0], [8, 3, 5.5], LEERE.amethyst, { glow: 0.5, grain: 0.06 })],
});

const leerenbrut = quadruped({
  id: 'leerenbrut',
  body: LEERE.obsidian,
  legs: '#150f26',
  accent: LEERE.stein,
  length: 11,
  height: 8,
  width: 8,
  legCount: 4,
  headSize: 5.5,
  eyes: { color: LEERE.amethystHell, glow: 1 },
  bodyProps: [box([0, 6.5, -1], [4, 3.6, 7], LEERE.amethyst, { glow: 0.6, grain: 0.05 })],
});

const echo = floater({
  id: 'echo',
  core: LEERE.amethystHell,
  shell: LEERE.stein,
  glowColor: LEERE.schimmer,
  size: 9,
  hover: 7,
});

const rissgaenger = quadruped({
  id: 'rissgaenger',
  body: '#3a3050',
  legs: '#221b38',
  accent: LEERE.steinHell,
  length: 16,
  height: 13,
  width: 11,
  legCount: 4,
  headSize: 7,
  eyes: { color: '#ff7ad9', glow: 0.9 },
  bodyProps: [
    box([0, 11.5, 0], [2.4, 3.2, 14], LEERE.amethyst, { glow: 0.7, grain: 0.05 }),
    box([0, 13, -4], [5, 4, 4], LEERE.steinHell),
  ],
});

// --- Bosse -----------------------------------------------------------------

/** Waldwaechter: ein Golem aus Stamm und Laub. */
const waldwaechter: VoxelModel = {
  id: 'waldwaechter',
  parts: [
    ...[-1, 1].map((sx) =>
      part(
        `bein${sx}`,
        [sx * 6, 14, 0],
        [
          box([sx * 6, 7, 0], [9, 14, 9], WALD.rinde),
          box([sx * 6, 1.5, 0], [11, 3, 11], WALD.erdeDunkel),
        ],
        { swing: { axis: 'x', amp: 0.28, phase: sx > 0 ? 0 : Math.PI } },
      ),
    ),
    part(
      'rumpf',
      [0, 14, 0],
      [
        box([0, 26, 0], [22, 24, 14], WALD.rinde),
        box([0, 34, 0], [24, 10, 16], WALD.laub, { grain: 0.15 }),
        box([0, 24, 7.4], [8, 8, 1], WALD.moos, { glow: 0.3, grain: 0.1 }),
      ],
      { bob: { amp: 0.7, phase: Math.PI / 2 } },
    ),
    ...[-1, 1].map((sx) =>
      part(
        `arm${sx}`,
        [sx * 13, 36, 0],
        [
          box([sx * 14, 26, 0], [7, 22, 7], WALD.rinde),
          box([sx * 14, 15, 0], [9, 6, 9], WALD.laub, { grain: 0.15 }),
        ],
        { swing: { axis: 'x', amp: 0.26, phase: sx > 0 ? Math.PI : 0 } },
      ),
    ),
    part(
      'kopf',
      [0, 38, 0],
      [
        box([0, 44, 0], [14, 12, 13], WALD.rinde),
        box([0, 50, 0], [18, 6, 16], WALD.laub, { grain: 0.15 }),
        box([-3.2, 45, 6.8], [3, 3, 0.8], WALD.augenGelb, { glow: 1, grain: 0 }),
        box([3.2, 45, 6.8], [3, 3, 0.8], WALD.augenGelb, { glow: 1, grain: 0 }),
      ],
      { bob: { amp: 0.7, phase: Math.PI / 2 } },
    ),
  ],
};

/** Schmelzherz: ein schwebender Kern in einem gebrochenen Panzer. */
const schmelzherz: VoxelModel = {
  id: 'schmelzherz',
  hover: 4,
  parts: [
    part(
      'panzer',
      [0, 22, 0],
      [
        box([0, 22, 0], [26, 26, 26], GLUT.basalt),
        box([0, 36, 0], [18, 4, 18], GLUT.basaltHell),
        box([0, 8, 0], [22, 4, 22], GLUT.basaltHell),
      ],
      { bob: { amp: 0.9, phase: 0 } },
    ),
    part(
      'kern',
      [0, 22, 0],
      [
        box([0, 22, 0], [16, 16, 16], GLUT.lava, { glow: 0.9, grain: 0.06 }),
        box([0, 22, 13.4], [11, 11, 1], GLUT.magma, { glow: 1, grain: 0.05 }),
        box([0, 22, -13.4], [11, 11, 1], GLUT.magma, { glow: 1, grain: 0.05 }),
        box([13.4, 22, 0], [1, 11, 11], GLUT.magma, { glow: 1, grain: 0.05 }),
        box([-13.4, 22, 0], [1, 11, 11], GLUT.magma, { glow: 1, grain: 0.05 }),
      ],
      { bob: { amp: 1.3, phase: Math.PI / 3 } },
    ),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        part(
          `scherbe${sx}${sz}`,
          [0, 22, 0],
          [box([sx * 17, 22 + sz * 8, sz * 17], [6, 6, 6], GLUT.basaltHell)],
          { bob: { amp: 1.8, phase: sx * 1.1 + sz * 0.6 } },
        ),
      ),
    ),
  ],
};

/** Der Verschlinger: ein Rachen aus der Leere mit drei Panzerungen. */
const verschlinger: VoxelModel = {
  id: 'verschlinger',
  hover: 3,
  parts: [
    part(
      'leib',
      [0, 20, 0],
      [
        box([0, 20, 0], [30, 30, 24], LEERE.obsidian),
        box([0, 20, 0], [32, 10, 26], LEERE.stein),
        box([0, 34, 0], [22, 6, 20], LEERE.steinHell),
      ],
      { bob: { amp: 0.8, phase: 0 } },
    ),
    part(
      'rachenOben',
      [0, 22, 12],
      [
        box([0, 27, 15], [22, 8, 10], LEERE.steinHell),
        ...[-3, -1, 1, 3].map((i) =>
          box([i * 4, 22.5, 18], [2.6, 5, 2.6], LEERE.amethystHell, { grain: 0.05 }),
        ),
      ],
      { swing: { axis: 'x', amp: 0.22, phase: 0 } },
    ),
    part(
      'rachenUnten',
      [0, 18, 12],
      [
        box([0, 13, 15], [22, 8, 10], LEERE.steinHell),
        ...[-3, -1, 1, 3].map((i) =>
          box([i * 4, 17.5, 18], [2.6, 5, 2.6], LEERE.amethystHell, { grain: 0.05 }),
        ),
      ],
      { swing: { axis: 'x', amp: -0.22, phase: 0 } },
    ),
    part(
      'schlund',
      [0, 20, 0],
      [box([0, 20, 13], [16, 12, 3], LEERE.amethyst, { glow: 0.9, grain: 0.05 })],
      { bob: { amp: 0.5, phase: Math.PI } },
    ),
    ...[-1, 1].map((sx) =>
      part(
        `auge${sx}`,
        [0, 20, 0],
        [box([sx * 11, 34, 9], [4, 4, 4], '#ff7ad9', { glow: 1, grain: 0 })],
        { bob: { amp: 0.6, phase: sx } },
      ),
    ),
  ],
};

export const CREATURE_MODELS: readonly VoxelModel[] = [
  moderling,
  krabbler,
  knochenschuetze,
  sprengling,
  magmakoloss,
  aschefalter,
  glutgeist,
  schildwart,
  schreiter,
  leerenbrut,
  echo,
  rissgaenger,
];

export const BOSS_MODELS: readonly VoxelModel[] = [waldwaechter, schmelzherz, verschlinger];
