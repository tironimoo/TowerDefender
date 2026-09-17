/**
 * Ein Simulationsschritt.
 *
 * Die Reihenfolge der Systeme ist fest. Gleicher Eingang ergibt dadurch immer
 * denselben Ausgang. Siehe docs/03-architektur.md, Abschnitt Aufbau der
 * Simulation.
 */

import type { SimEvent } from '../model/types';
import type { World } from '../model/world';
import { systemWaves, systemWaveClear } from '../systems/waves';
import { systemMovement } from '../systems/movement';
import { systemEffects } from '../systems/effects';
import { systemTowers } from '../systems/towers';
import { systemProjectiles } from '../systems/projectiles';
import { systemDamage } from '../systems/damage';
import { systemDeaths, systemLeaks, systemWinLose } from '../systems/outcome';

/** Obergrenze fuer ungelesene Ereignisse, damit nichts unbegrenzt waechst. */
const MAX_EVENTS = 20000;

export function step(world: World): void {
  if (world.status === 'gewonnen' || world.status === 'verloren') return;

  world.tick += 1;
  world.stats.ticks = world.tick;

  systemWaves(world);
  systemMovement(world);
  systemEffects(world);
  systemTowers(world);
  systemProjectiles(world);
  systemDamage(world);
  systemDeaths(world);
  systemLeaks(world);
  systemWaveClear(world);
  systemWinLose(world);

  if (world.events.length > MAX_EVENTS) {
    world.events.splice(0, world.events.length - MAX_EVENTS);
  }
}

/** Gibt die gesammelten Ereignisse zurueck und leert den Puffer. */
export function drainEvents(world: World): SimEvent[] {
  const drained = world.events.slice();
  world.events.length = 0;
  return drained;
}
