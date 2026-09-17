/**
 * Gegner erzeugen.
 *
 * Steht bewusst eigenstaendig, weil sowohl die Wellen als auch Bosse und
 * zerfallende Gegner neue Gegner ins Spiel bringen.
 */

import type { Enemy } from '../model/types';
import { TICKS_PER_SECOND } from '../model/types';
import type { World } from '../model/world';
import { positionOnRoute, routeLengthFor } from './route';

const scratch = { x: 0, y: 0 };

export interface SpawnParameter {
  readonly defId: string;
  readonly waveNumber: number;
  readonly routeIndex: number;
  /** Startstrecke auf dem Weg. Null bedeutet am Anfang. */
  readonly travelled: number;
  readonly healthFactor: number;
  readonly goldFactor: number;
  readonly speedFactor: number;
}

export function erzeugeGegner(world: World, parameter: SpawnParameter): Enemy | null {
  const def = world.content.enemies.get(parameter.defId);
  if (def === undefined) throw new Error(`Unbekannter Gegner: ${parameter.defId}`);

  const routeIndex = world.routes[parameter.routeIndex] === undefined ? 0 : parameter.routeIndex;
  const route = world.routes[routeIndex];
  if (route === undefined) throw new Error('Level ohne Weg.');

  const enemy = world.enemies.acquire();
  enemy.id = world.nextEntityId++;
  enemy.defId = def.id;
  enemy.waveNumber = parameter.waveNumber;
  enemy.routeIndex = routeIndex;
  enemy.routeLength = routeLengthFor(route, def.flying);
  enemy.travelled = Math.max(0, Math.min(enemy.routeLength, parameter.travelled));
  enemy.maxHealth = def.health * parameter.healthFactor;
  enemy.health = enemy.maxHealth;
  enemy.maxShield = def.schild + enemy.maxHealth * (world.mutator?.schildAnteil ?? 0);
  enemy.shield = enemy.maxShield;
  enemy.baseSpeed = def.speed * parameter.speedFactor;
  enemy.armor = def.boss !== null ? (def.boss.phasen[0]?.armor ?? def.armor) : def.armor;
  enemy.gold = Math.max(1, Math.round(def.gold * parameter.goldFactor));
  enemy.flying = def.flying;
  enemy.invisible = def.invisible;
  enemy.revealed = false;
  enemy.heading = 0;
  enemy.slowFactor = 0;
  enemy.slowTicksLeft = 0;
  enemy.burnDps = 0;
  enemy.burnTicksLeft = 0;
  enemy.burnSourceDefId = '';
  enemy.armorShred = 0;
  enemy.damageAmp = 0;
  enemy.invulnerableTicks = 0;
  enemy.behaviourFired = false;
  enemy.bossPhase = 0;
  enemy.reachedGoal = false;

  const intervall = intervallVon(def.behaviour);
  enemy.behaviourTicks = intervall > 0 ? Math.round(intervall * TICKS_PER_SECOND) : 0;

  positionOnRoute(route, enemy.travelled, def.flying, scratch);
  enemy.x = scratch.x;
  enemy.y = scratch.y;

  world.events.push({ type: 'gegner-erschienen', enemyId: enemy.id, defId: def.id });
  return enemy;
}

function intervallVon(behaviour: { kind: string } & Record<string, unknown>): number {
  const wert = behaviour['interval'];
  return typeof wert === 'number' ? wert : 0;
}
