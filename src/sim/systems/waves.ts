/** Wellen planen, starten und als abgeraeumt erkennen. */

import type { WaveDef } from '../model/types';
import { SECONDS_PER_TICK, TICKS_PER_SECOND } from '../model/types';
import type { World } from '../model/world';
import { waveGoldFactor, waveHealthFactor, EARLY_START_BONUS_PER_SECOND } from '../core/balance';
import { erzeugeGegner } from '../core/spawn';

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

export function goldFaktor(world: World, waveNumber: number): number {
  return waveGoldFactor(waveNumber) * world.difficulty.goldFactor * (world.mutator?.goldFactor ?? 1);
}

export function startNextWave(world: World, bonusSeconds: number): void {
  if (world.wavesStarted >= world.waveCount) return;

  const waveNumber = world.wavesStarted + 1;
  const def = waveDefFor(world, waveNumber);
  const grundFaktor = world.difficulty.healthFactor * (world.mutator?.healthFactor ?? 1);
  const healthFactor = waveHealthFactor(waveNumber) * grundFaktor;

  for (const group of def.groups) {
    // Bosse sind fuer ihre Karte entworfen. Wuerde die Wellensteigerung auch
    // auf sie wirken, waere ein Boss in Welle 25 vierfach so zaeh wie gedacht.
    const istBoss = world.content.enemies.get(group.enemyId)?.boss !== null;
    const order = world.spawns.acquire();
    order.enemyId = group.enemyId;
    order.remaining = group.count;
    order.nextTick = world.tick + Math.round(group.delay * TICKS_PER_SECOND);
    order.spacingTicks = Math.max(1, Math.round(group.spacing * TICKS_PER_SECOND));
    order.routeIndex = group.pathIndex;
    order.waveNumber = waveNumber;
    order.healthFactor = istBoss ? grundFaktor : healthFactor;
    order.goldFactor = goldFaktor(world, waveNumber);
    order.speedFactor = world.difficulty.speedFactor * (world.mutator?.speedFactor ?? 1);
  }

  world.wavesStarted = waveNumber;
  world.status = 'laufend';
  world.waveTimer = world.wavesStarted < world.waveCount ? world.level.waveInterval : -1;

  const bonus = Math.floor(
    Math.max(0, bonusSeconds) * EARLY_START_BONUS_PER_SECOND * world.boni.wellenBonus,
  );
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
  if (world.status === 'vorbereitung' && world.waveTimer > 0) {
    // Mutator ohne Bauphase: die Uhr laeuft schon vor der ersten Welle.
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
      erzeugeGegner(world, {
        defId: order.enemyId,
        waveNumber: order.waveNumber,
        routeIndex: order.routeIndex,
        travelled: 0,
        healthFactor: order.healthFactor,
        goldFactor: order.goldFactor,
        speedFactor: order.speedFactor,
      });
      order.remaining -= 1;
      order.nextTick += order.spacingTicks;
    }
    if (order.remaining <= 0) world.spawns.release(order);
  }
}

/** Erkennt abgeraeumte Wellen und zahlt die Belohnung aus. */
export function systemWaveClear(world: World): void {
  while (world.wavesCleared < world.wavesStarted) {
    const waveNumber = world.wavesCleared + 1;
    if (hasPending(world, waveNumber)) return;

    world.wavesCleared = waveNumber;
    const def = waveDefFor(world, waveNumber);
    const reward = Math.round(
      def.reward *
        world.difficulty.goldFactor *
        (world.mutator?.goldFactor ?? 1) *
        world.boni.wellenBonus,
    );
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
