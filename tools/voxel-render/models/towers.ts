/**
 * Turmmodelle.
 *
 * Jeder Turm entsteht aus dem gemeinsamen Sockel in bausteine.ts und einem
 * eigenen Kopf. Der Sockel waechst mit der Ausbaustufe, der Kopf bleibt
 * erkennbar. Dadurch sieht man einem Turm auf einen Blick an, was er tut und
 * wie weit er ausgebaut ist.
 */

import type { VoxelBox, VoxelModel } from '../voxel';
import { box, tower } from './bausteine';
import { GEMEINSAM } from './palette';

const H = GEMEINSAM;

type KopfBauer = (y: number) => readonly VoxelBox[];

interface TurmVorlage {
  readonly id: string;
  readonly base: string;
  readonly mid: string;
  readonly accent: string;
  readonly glowColor?: string;
  readonly head: KopfBauer;
}

const VORLAGEN: readonly TurmVorlage[] = [
  {
    id: 'armbrustturm',
    base: H.steinDunkel,
    mid: H.stein,
    accent: H.holz,
    head: (y) => [
      box([0, y + 2, 0], [10, 4, 10], H.holz),
      box([0, y + 5.5, 1], [3, 3, 9], H.holzDunkel),
      box([0, y + 5.5, 2], [13, 1.6, 1.6], H.holz),
      box([0, y + 5.5, 6], [2, 1, 4], H.eisen),
    ],
  },
  {
    id: 'balliste',
    base: H.steinDunkel,
    mid: H.holzDunkel,
    accent: H.holz,
    head: (y) => [
      box([0, y + 2, 0], [12, 4, 12], H.holz),
      box([0, y + 6, 0], [4, 4, 16], H.holzDunkel),
      box([0, y + 7, 3], [18, 2, 2], H.holz),
      box([0, y + 7, 9], [3, 2, 7], H.eisen),
      box([0, y + 9, -5], [3, 3, 4], H.eisen),
    ],
  },
  {
    id: 'blitzspule',
    base: H.steinDunkel,
    mid: H.eisen,
    accent: H.kupfer,
    glowColor: '#7fd4ff',
    head: (y) => [
      box([0, y + 2, 0], [9, 4, 9], H.eisen),
      box([0, y + 6, 0], [3, 8, 3], H.kupfer),
      box([0, y + 5, 0], [9, 1.6, 9], H.kupfer),
      box([0, y + 8, 0], [7, 1.6, 7], H.kupfer),
      box([0, y + 11.5, 0], [3.5, 3.5, 3.5], '#7fd4ff', { glow: 1, grain: 0 }),
    ],
  },
  {
    id: 'schleuder',
    base: H.steinDunkel,
    mid: H.holzDunkel,
    accent: H.holz,
    head: (y) => [
      box([0, y + 2, 0], [12, 4, 12], H.holz),
      box([-4, y + 7, -2], [2.5, 10, 2.5], H.holzDunkel),
      box([4, y + 7, -2], [2.5, 10, 2.5], H.holzDunkel),
      box([0, y + 11, 1], [3, 2.5, 10], H.holz),
      box([0, y + 13, 5.5], [6, 4, 6], H.stein),
    ],
  },
  {
    id: 'glutduese',
    base: H.steinDunkel,
    mid: '#6b4a3a',
    accent: H.kupfer,
    glowColor: '#ff8a3c',
    head: (y) => [
      box([0, y + 2.5, 0], [10, 5, 10], H.kupfer),
      box([0, y + 6, 0], [6, 6, 6], '#5a3a2a'),
      box([0, y + 6, 5], [4, 4, 7], H.kupfer),
      box([0, y + 6, 9.5], [5, 5, 2], '#ff8a3c', { glow: 1, grain: 0.05 }),
      box([-4.5, y + 8, -2], [3, 6, 3], H.eisen),
    ],
  },
  {
    id: 'ambossfalle',
    base: H.steinDunkel,
    mid: H.stein,
    accent: H.eisen,
    head: (y) => [
      box([0, y + 2, 0], [12, 4, 12], H.stein),
      box([0, y + 5.5, 0], [6, 4, 8], '#4a4f57'),
      box([0, y + 9, 0], [12, 4, 10], '#3a3f47'),
      box([5, y + 9, 0], [5, 3, 4], '#3a3f47'),
    ],
  },
  {
    id: 'frostturm',
    base: H.steinDunkel,
    mid: '#7f9db0',
    accent: H.eis,
    glowColor: H.eisHell,
    head: (y) => [
      box([0, y + 2, 0], [10, 4, 10], H.eis),
      box([0, y + 7, 0], [5, 10, 5], H.eisHell, { glow: 0.5, grain: 0.08 }),
      box([0, y + 12.5, 0], [3, 5, 3], H.eisHell, { glow: 0.8, grain: 0.05 }),
      box([-4, y + 5.5, 0], [3, 6, 3], H.eis, { glow: 0.3 }),
      box([4, y + 5.5, 0], [3, 6, 3], H.eis, { glow: 0.3 }),
    ],
  },
  {
    id: 'netzwerfer',
    base: H.steinDunkel,
    mid: '#6f7a6a',
    accent: H.netz,
    head: (y) => [
      box([0, y + 2, 0], [10, 4, 10], '#6f7a6a'),
      box([0, y + 6, 1], [7, 6, 9], '#5b6457'),
      box([0, y + 6, 6.5], [5, 5, 3], H.netz, { grain: 0.18 }),
      box([0, y + 10, -2], [4, 4, 4], H.netz, { grain: 0.18 }),
    ],
  },
  {
    id: 'kolbenstoss',
    base: H.steinDunkel,
    mid: H.holzDunkel,
    accent: H.eisen,
    head: (y) => [
      box([0, y + 2.5, 0], [12, 5, 12], H.holz),
      box([0, y + 7, -1], [10, 5, 8], H.holzDunkel),
      box([0, y + 7, 4], [8, 6, 3], H.eisen),
      box([0, y + 7, 7], [9, 7, 1.5], '#8b9098'),
    ],
  },
  {
    id: 'leuchtfeuer',
    base: H.steinDunkel,
    mid: H.stein,
    accent: H.gold,
    glowColor: '#fff2b0',
    head: (y) => [
      box([0, y + 2, 0], [10, 4, 10], H.gold),
      box([0, y + 6, 0], [7, 6, 7], '#2a2a33'),
      box([0, y + 6, 0], [4.5, 4.5, 4.5], '#fff2b0', { glow: 1, grain: 0 }),
      box([0, y + 12, 0], [2.5, 8, 2.5], '#fff2b0', { glow: 1, grain: 0 }),
    ],
  },
  {
    id: 'alchemieturm',
    base: H.steinDunkel,
    mid: '#4a4550',
    accent: H.glasGruen,
    glowColor: H.glasGruen,
    head: (y) => [
      box([0, y + 3, 0], [11, 6, 11], '#3a3640'),
      box([0, y + 6.5, 0], [9, 1.2, 9], H.glasGruen, { glow: 0.7, grain: 0.05 }),
      box([-5.5, y + 4, 0], [1.5, 7, 2], '#2a262f'),
      box([5.5, y + 4, 0], [1.5, 7, 2], '#2a262f'),
      box([3, y + 9, 3], [2.5, 2.5, 2.5], H.glasGruen, { glow: 0.8, grain: 0 }),
      box([-2.5, y + 11, -1], [2, 2, 2], H.glasGruen, { glow: 0.8, grain: 0 }),
    ],
  },
  {
    id: 'spaehturm',
    base: H.steinDunkel,
    mid: H.holz,
    accent: H.eisen,
    glowColor: '#cfe8ff',
    head: (y) => [
      box([0, y + 2, 0], [11, 4, 11], H.holz),
      box([0, y + 7, -2], [8, 6, 6], H.holzDunkel),
      box([0, y + 8, 3], [5, 5, 6], H.eisen),
      box([0, y + 8, 6.5], [4, 4, 1], '#cfe8ff', { glow: 0.9, grain: 0 }),
      box([0, y + 12, -2], [10, 1.5, 10], H.holz),
    ],
  },
];

/** Alle Tuerme in allen vier Ausbaustufen. */
export const TOWER_MODELS: readonly VoxelModel[] = VORLAGEN.flatMap((vorlage) =>
  [0, 1, 2, 3].map((level) =>
    tower({
      id: `${vorlage.id}_s${level}`,
      base: vorlage.base,
      mid: vorlage.mid,
      accent: vorlage.accent,
      ...(vorlage.glowColor === undefined ? {} : { glowColor: vorlage.glowColor }),
      level,
      head: (y) => vorlage.head(y),
    }),
  ),
);

export const TOWER_IDS: readonly string[] = VORLAGEN.map((vorlage) => vorlage.id);
