/**
 * Gegnerdefinitionen.
 *
 * Stand Abschnitt 1: die vier Gegner der Waldsenke mit ihren Grundwerten aus
 * docs/05-startwerte.md. Die Sonderverhalten von Knochenschuetze und
 * Sprengling, also Beschuss und Detonation neben Tuermen, brauchen eigene
 * Mechaniken und kommen in Abschnitt 4.
 */

import type { EnemyDef } from '@sim/model/types';

export const ENEMY_DEFS: readonly EnemyDef[] = [
  {
    id: 'moderling',
    name: 'Moderling',
    health: 60,
    speed: 0.8,
    armor: 'leder',
    gold: 6,
    flying: false,
    invisible: false,
  },
  {
    id: 'krabbler',
    name: 'Krabbler',
    health: 18,
    speed: 2.2,
    armor: 'leder',
    gold: 2,
    flying: false,
    invisible: false,
  },
  {
    id: 'knochenschuetze',
    name: 'Knochenschuetze',
    health: 90,
    speed: 1.0,
    armor: 'eisen',
    gold: 10,
    flying: false,
    invisible: false,
  },
  {
    id: 'sprengling',
    name: 'Sprengling',
    health: 45,
    speed: 1.6,
    armor: 'leder',
    gold: 8,
    flying: false,
    invisible: false,
  },
];
