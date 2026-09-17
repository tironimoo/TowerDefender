/**
 * Level 1: Lichtung am Moorbach.
 *
 * Erste Karte der Waldsenke. Ein Weg mit vier Kurven, zwoelf Bauplaetze,
 * zehn Wellen. Fuehrt Armbrustturm und Schleuder ein.
 *
 * Koordinaten in Kacheln. Die Karte ist zwanzig mal zwoelf Kacheln gross und
 * damit fuer das Querformat ausgelegt.
 */

import type { LevelDef, WaveDef } from '@sim/model/types';

/** Wellenbonus nach docs/05-startwerte.md: 40 plus 8 je vorheriger Welle. */
function reward(waveNumber: number): number {
  return 40 + 8 * (waveNumber - 1);
}

const WAVES: readonly WaveDef[] = [
  {
    groups: [{ enemyId: 'moderling', count: 8, spacing: 1.2, delay: 0, pathIndex: 0 }],
    reward: reward(1),
  },
  {
    groups: [{ enemyId: 'moderling', count: 10, spacing: 1.0, delay: 0, pathIndex: 0 }],
    reward: reward(2),
  },
  {
    groups: [
      { enemyId: 'moderling', count: 6, spacing: 1.2, delay: 0, pathIndex: 0 },
      { enemyId: 'krabbler', count: 8, spacing: 0.5, delay: 6, pathIndex: 0 },
    ],
    reward: reward(3),
  },
  {
    groups: [{ enemyId: 'krabbler', count: 14, spacing: 0.45, delay: 0, pathIndex: 0 }],
    reward: reward(4),
  },
  {
    groups: [
      { enemyId: 'moderling', count: 10, spacing: 1.0, delay: 0, pathIndex: 0 },
      { enemyId: 'knochenschuetze', count: 2, spacing: 2.0, delay: 8, pathIndex: 0 },
    ],
    reward: reward(5),
  },
  {
    groups: [
      { enemyId: 'krabbler', count: 12, spacing: 0.45, delay: 0, pathIndex: 0 },
      { enemyId: 'sprengling', count: 4, spacing: 1.5, delay: 5, pathIndex: 0 },
    ],
    reward: reward(6),
  },
  {
    groups: [
      { enemyId: 'moderling', count: 14, spacing: 0.9, delay: 0, pathIndex: 0 },
      { enemyId: 'knochenschuetze', count: 3, spacing: 2.0, delay: 6, pathIndex: 0 },
    ],
    reward: reward(7),
  },
  {
    groups: [
      { enemyId: 'krabbler', count: 16, spacing: 0.4, delay: 0, pathIndex: 0 },
      { enemyId: 'sprengling', count: 6, spacing: 1.2, delay: 4, pathIndex: 0 },
    ],
    reward: reward(8),
  },
  {
    groups: [
      { enemyId: 'moderling', count: 12, spacing: 0.9, delay: 0, pathIndex: 0 },
      { enemyId: 'knochenschuetze', count: 6, spacing: 1.6, delay: 5, pathIndex: 0 },
    ],
    reward: reward(9),
  },
  {
    groups: [
      { enemyId: 'moderling', count: 20, spacing: 0.7, delay: 0, pathIndex: 0 },
      { enemyId: 'krabbler', count: 10, spacing: 0.4, delay: 6, pathIndex: 0 },
      { enemyId: 'knochenschuetze', count: 6, spacing: 1.5, delay: 12, pathIndex: 0 },
      { enemyId: 'sprengling', count: 6, spacing: 1.2, delay: 18, pathIndex: 0 },
    ],
    reward: reward(10),
  },
];

export const LEVEL_01: LevelDef = {
  id: 'level-01',
  name: 'Lichtung am Moorbach',
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
  buildSlots: [
    { x: 3, y: 4.5 },
    { x: 3, y: 7.5 },
    { x: 6.5, y: 4.5 },
    { x: 6.5, y: 0.5 },
    { x: 9, y: 3.5 },
    { x: 9, y: 0.5 },
    { x: 13.5, y: 3.5 },
    { x: 10.5, y: 5.5 },
    { x: 13.5, y: 7 },
    { x: 15, y: 10.5 },
    { x: 16.5, y: 7.5 },
    { x: 18.5, y: 11 },
  ],
  startGold: 250,
  lives: 20,
  waveInterval: 20,
  waves: WAVES,
};
