/**
 * Kacheln, Requisiten und Geschosse.
 *
 * Kacheln haben ihre Oberflaeche bei y gleich null und ihren Koerper darunter.
 * Dadurch liegt der Ankerpunkt genau in der Mitte der oberen Raute.
 */

import type { VoxelModel } from '../voxel';
import { box, part } from './bausteine';
import { GEMEINSAM, GLUT, LEERE, WALD } from './palette';

const KACHEL = 16;
const DICKE = 6;

function kachel(id: string, oben: string, seite: string, extra: Parameters<typeof box>[3] = {}): VoxelModel {
  return {
    id,
    parts: [
      part('block', [0, 0, 0], [
        box([0, -DICKE / 2, 0], [KACHEL, DICKE, KACHEL], seite, { grain: 0.1 }),
        box([0, -0.4, 0], [KACHEL, 0.8, KACHEL], oben, { grain: 0.13, ...extra }),
      ]),
    ],
  };
}

export const TILE_MODELS: readonly VoxelModel[] = [
  // Waldsenke
  kachel('kachel_gras', WALD.gras, WALD.erde),
  kachel('kachel_gras2', WALD.grasHell, WALD.erde),
  kachel('kachel_weg', WALD.erde, WALD.erdeDunkel),
  kachel('kachel_wasser', WALD.wasser, '#2d5580', { glow: 0.25, grain: 0.07 }),
  kachel('kachel_fels', WALD.stein, '#5f646b'),
  // Glutschlucht
  kachel('kachel_basalt', GLUT.basalt, GLUT.russ),
  kachel('kachel_basalt2', GLUT.basaltHell, GLUT.russ),
  kachel('kachel_asche', GLUT.asche, '#4a4550'),
  kachel('kachel_lava', GLUT.lava, GLUT.magma, { glow: 0.85, grain: 0.16 }),
  // Leerlande
  kachel('kachel_leere', LEERE.stein, LEERE.obsidian),
  kachel('kachel_leere2', LEERE.steinHell, LEERE.obsidian),
  kachel('kachel_obsidian', LEERE.obsidian, '#120c22'),
  kachel('kachel_amethyst', LEERE.amethyst, LEERE.stein, { glow: 0.5, grain: 0.14 }),
  // Gemeinsam
  kachel('kachel_plattform', GEMEINSAM.stein, GEMEINSAM.steinDunkel),
];

export const PROP_MODELS: readonly VoxelModel[] = [
  {
    id: 'prop_baum',
    parts: [
      part('stamm', [0, 0, 0], [box([0, 9, 0], [5, 18, 5], WALD.rinde)]),
      part('krone', [0, 0, 0], [
        box([0, 22, 0], [18, 8, 18], WALD.laub, { grain: 0.17 }),
        box([0, 28, 0], [12, 6, 12], '#4f8f42', { grain: 0.17 }),
        box([0, 32, 0], [6, 4, 6], '#5aa04b', { grain: 0.17 }),
      ]),
    ],
  },
  {
    id: 'prop_busch',
    parts: [
      part('busch', [0, 0, 0], [
        box([0, 4, 0], [11, 8, 11], WALD.moos, { grain: 0.18 }),
        box([2, 9, -1], [6, 4, 6], WALD.laub, { grain: 0.18 }),
      ]),
    ],
  },
  {
    id: 'prop_fels',
    parts: [
      part('fels', [0, 0, 0], [
        box([0, 4, 0], [13, 8, 12], WALD.stein),
        box([-3, 9, 2], [7, 6, 7], '#6d727a'),
      ]),
    ],
  },
  {
    id: 'prop_basaltsaeule',
    parts: [
      part('saeule', [0, 0, 0], [
        box([0, 11, 0], [9, 22, 9], GLUT.basalt),
        box([0, 21, 0], [6, 6, 6], GLUT.basaltHell),
        box([0, 5, 4.7], [4, 6, 0.8], GLUT.magma, { glow: 0.8, grain: 0.06 }),
      ]),
    ],
  },
  {
    id: 'prop_glutstein',
    parts: [
      part('stein', [0, 0, 0], [
        box([0, 4, 0], [12, 8, 12], GLUT.russ),
        box([0, 8, 0], [7, 3, 7], GLUT.magma, { glow: 0.9, grain: 0.08 }),
      ]),
    ],
  },
  {
    id: 'prop_kristall',
    parts: [
      part('kristall', [0, 0, 0], [
        box([0, 8, 0], [6, 16, 6], LEERE.amethyst, { glow: 0.55, grain: 0.1 }),
        box([4, 5, 2], [4, 10, 4], LEERE.amethystHell, { glow: 0.7, grain: 0.1 }),
        box([-3, 4, -2], [3, 8, 3], LEERE.schimmer, { glow: 0.7, grain: 0.1 }),
      ]),
    ],
  },
  {
    id: 'prop_truemmer',
    parts: [
      part('truemmer', [0, 0, 0], [
        box([0, 3, 0], [14, 6, 10], LEERE.stein),
        box([4, 8, -2], [6, 5, 6], LEERE.steinHell),
      ]),
    ],
  },
  {
    id: 'prop_fackel',
    parts: [
      part('fackel', [0, 0, 0], [
        box([0, 7, 0], [2.5, 14, 2.5], GEMEINSAM.holzDunkel),
        box([0, 15, 0], [4, 4, 4], '#ffb347', { glow: 1, grain: 0.05 }),
      ]),
    ],
  },
];

export const PROJECTILE_MODELS: readonly VoxelModel[] = [
  {
    id: 'schuss_pfeil',
    parts: [
      part('pfeil', [0, 0, 0], [
        box([0, 0, 0], [1.4, 1.4, 9], '#8a6234'),
        box([0, 0, 5.2], [1.8, 1.8, 2], GEMEINSAM.eisen),
        box([0, 0, -4.5], [3.4, 0.6, 2.4], '#e8e2cf'),
      ]),
    ],
  },
  {
    id: 'schuss_bolzen',
    parts: [
      part('bolzen', [0, 0, 0], [
        box([0, 0, 0], [2.6, 2.6, 14], '#63451f'),
        box([0, 0, 8], [3.2, 3.2, 3], GEMEINSAM.eisen),
      ]),
    ],
  },
  {
    id: 'schuss_stein',
    parts: [part('stein', [0, 0, 0], [box([0, 0, 0], [7, 7, 7], GEMEINSAM.steinDunkel)])],
  },
  {
    id: 'schuss_frost',
    parts: [
      part('frost', [0, 0, 0], [
        box([0, 0, 0], [4, 4, 7], GEMEINSAM.eisHell, { glow: 0.8, grain: 0.06 }),
      ]),
    ],
  },
  {
    id: 'schuss_netz',
    parts: [
      part('netz', [0, 0, 0], [
        box([0, 0, 0], [6, 6, 2], GEMEINSAM.netz, { grain: 0.2 }),
        box([0, 0, 0], [2, 8, 2], GEMEINSAM.netz, { grain: 0.2 }),
      ]),
    ],
  },
  {
    id: 'schuss_blitz',
    parts: [
      part('blitz', [0, 0, 0], [
        box([0, 0, 0], [2.4, 2.4, 8], '#7fd4ff', { glow: 1, grain: 0 }),
      ]),
    ],
  },
  {
    id: 'schuss_glut',
    parts: [
      part('glut', [0, 0, 0], [box([0, 0, 0], [5, 5, 5], '#ff8a3c', { glow: 1, grain: 0.1 })]),
    ],
  },
  {
    id: 'schuss_arkan',
    parts: [
      part('arkan', [0, 0, 0], [
        box([0, 0, 0], [5, 5, 5], LEERE.amethystHell, { glow: 1, grain: 0.06 }),
      ]),
    ],
  },
];
