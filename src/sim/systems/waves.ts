/** Wellen planen, starten und als abgeraeumt erkennen. */

import type { SpawnOrder, WaveDef } from '../model/types';
import { SECONDS_PER_TICK, TICKS_PER_SECOND } from '../model/types';
import type { World } from '../model/world';
import { waveGoldFactor, waveHealthFactor, EARLY_START_BONUS_PER_SECOND } from '../core/balance';
import { positionOnRoute, routeLengthFor } from '../core/route';

const scratch = { x: 0, y: 0 };

/**
 * Die Wellendefinition fuer eine Wellennummer.
 * Zusatzwellen der hoeheren Schwierigkeitsgrade wiederholen die letzte Welle,
 * werden aber weiter hochskaliert.
 */
export function waveDefFor(world: World, waveNumber: number): WaveDef {
  const waves = world.level.waves;
  const index = Math.min(waveNumber - 1, waves.length - 1);
  const def = waves[Math.max(0, index)];
  if (def === undefined) throw new Error('Level ohne Wellen.');
  return def;
}

export function startNextWave(world: World, bonusSeconds: number): void {
  if (world.wavesStarted >= world.waveCount) return;

  const waveNumber = world.wavesStarted + 1;
  const def = waveDefFor(world, waveNumber);
  const healthFactor = waveHealthFactor(waveNumber) * world.difficulty.healthFactor;
  const goldFactor = waveGoldFactor(waveNumber) * world.difficulty.goldFactor;

  for (const group of def.groups) {
    const order = world.spawns.acquire();
    order.enemyId = group.enemyId;
    order.remaining = group.count;
    order.nextTick = world.tick + Math.round(group.delay * TICKS_PER_SECOND);
    order.spacingTicks = Math.max(1, Math.round(group.spacing * TICKS_PER_SECOND));
    order.routeIndex = group.pathIndex;
    order.waveNumber = waveNumber;
    order.healthFactor = healthFactor;
    order.goldFactor = goldFactor;
    order.speedFactor = world.difficulty.speedFactor;
  }

  world.wavesStarted = waveNumber;
  world.status = 'laufend';
  world.waveTimer = world.wavesStarted < world.waveCount ? world.level.waveInterval : -1;

  const bonus = Math.floor(Math.max(0, bonusSeconds) * EARLY_START_BONUS_PER_SECOND);
  if (bonus > 0) {
    world.gold += bonus;
    world.stats.goldEarned += bonus;
  }
  world.events.push({ type: 'welle-gestartet', wave: waveNumber, bonus });
}

/** Zaehlt die Uhr bis zur naechsten Welle herunter und laesst Gegner erscheinen. */
export function systemWaves(world: World): void {
  if (world.status === 'laufend' && world.waveTimer > 0) {
    world.waveTimer -= SECONDS_PER_TICK;
    if (world.waveTimer <= 0) {
      world.waveTimer = 0;
      startNextWave(world, 0);
    }
  }

  const orders = world.spawns.items;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (order === undefined || !order.active) continue;

    while (order.remaining > 0 && order.nextTick <= world.tick) {
      spawnEnemy(world, order);
      order.remaining -= 1;
      order.nextTick += order.spacingTicks;
    }
    if (order.remaining <= 0) world.spawns.release(order);
  }
}

function spawnEnemy(world: World, order: SpawnOrder): void {
  const def = world.content.enemies.get(order.enemyId);
  if (def === undefined) throw new Error(`Unbekannter Gegner: ${order.enemyId}`);

  const route = world.routes[order.routeIndex] ?? world.routes[0];
  if (route === undefined) throw new Error('Level ohne Weg.');

  const enemy = world.enemies.acquire();
  enemy.id = world.nextEntityId++;
  enemy.defId = def.id;
  enemy.waveNumber = order.waveNumber;
  enemy.routeIndex = world.routes[order.routeIndex] === undefined ? 0 : order.routeIndex;
  enemy.travelled = 0;
  enemy.routeLength = routeLengthFor(route, def.flying);
  enemy.maxHealth = def.health * order.healthFactor;
  enemy.health = enemy.maxHealth;
  enemy.baseSpeed = def.speed * order.speedFactor;
  enemy.armor = def.armor;
  enemy.gold = Math.max(1, Math.round(def.gold * order.goldFactor));
  enemy.flying = def.flying;
  enemy.invisible = def.invisible;
  enemy.slowFactor = 0;
  enemy.slowTicksLeft = 0;
  enemy.burnDps = 0;
  enemy.burnTicksLeft = 0;
  enemy.burnSourceDefId = '';
  enemy.reachedGoal = false;

  positionOnRoute(route, 0, def.flying, scratch);
  enemy.x = scratch.x;
  enemy.y = scratch.y;

  world.events.push({ type: 'gegner-erschienen', enemyId: enemy.id, defId: def.id });
}

/** Erkennt abgeraeumte Wellen und zahlt die Belohnung aus. */
export function systemWaveClear(world: World): void {
  while (world.wavesCleared < world.wavesStarted) {
    const waveNumber = world.wavesCleared + 1;
    if (hasPending(world, waveNumber)) return;

    world.wavesCleared = waveNumber;
    const def = waveDefFor(world, waveNumber);
    const reward = Math.round(def.reward * world.difficulty.goldFactor);
    world.gold += reward;
    world.stats.goldEarned += reward;
    world.events.push({ type: 'welle-geschafft', wave: waveNumber, reward });
  }
}

function hasPending(world: World, waveNumber: number): boolean {
  const orders = world.spawns.items;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (order !== undefined && order.active && order.waveNumber === waveNumber) return true;
  }
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy !== undefined && enemy.active && enemy.waveNumber === waveNumber) return true;
  }
  return false;
}
