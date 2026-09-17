/**
 * Zustandseffekte.
 *
 * Verlangsamung und Fesselung sind derselbe Effekt mit unterschiedlicher
 * Staerke. Eine Fesselung ist eine Verlangsamung um hundert Prozent. Das spart
 * einen eigenen Mechanismus und verhaelt sich automatisch richtig.
 *
 * Brand ist nicht stapelbar. Ein neuer Brand ersetzt den alten, wenn er
 * staerker ist, und setzt in jedem Fall die Dauer zurueck.
 */

import type { EffectSpec, Enemy } from '../model/types';
import { SECONDS_PER_TICK, TICKS_PER_SECOND } from '../model/types';
import type { World } from '../model/world';

export function applyEffect(enemy: Enemy, effect: EffectSpec, sourceDefId: string): void {
  if (effect.slowFactor > 0 && effect.slowDuration > 0) {
    const ticks = Math.round(effect.slowDuration * TICKS_PER_SECOND);
    if (effect.slowFactor >= enemy.slowFactor || enemy.slowTicksLeft <= 0) {
      enemy.slowFactor = effect.slowFactor;
      enemy.slowTicksLeft = ticks;
    } else if (ticks > enemy.slowTicksLeft) {
      enemy.slowTicksLeft = ticks;
    }
  }

  if (effect.burnDps > 0 && effect.burnDuration > 0) {
    const ticks = Math.round(effect.burnDuration * TICKS_PER_SECOND);
    if (effect.burnDps >= enemy.burnDps || enemy.burnTicksLeft <= 0) {
      enemy.burnDps = effect.burnDps;
      enemy.burnSourceDefId = sourceDefId;
    }
    enemy.burnTicksLeft = Math.max(enemy.burnTicksLeft, ticks);
  }
}

export function systemEffects(world: World): void {
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active) continue;

    if (enemy.slowTicksLeft > 0) {
      enemy.slowTicksLeft -= 1;
      if (enemy.slowTicksLeft <= 0) enemy.slowFactor = 0;
    }

    if (enemy.burnTicksLeft > 0) {
      enemy.burnTicksLeft -= 1;
      world.damageQueue.push({
        enemyPoolIndex: enemy.poolIndex,
        amount: enemy.burnDps * SECONDS_PER_TICK,
        damageType: 'feuer',
        armorPierce: 0,
        towerId: 0,
        towerDefId: enemy.burnSourceDefId,
        effect: { slowFactor: 0, slowDuration: 0, burnDps: 0, burnDuration: 0 },
      });
      if (enemy.burnTicksLeft <= 0) {
        enemy.burnDps = 0;
        enemy.burnSourceDefId = '';
      }
    }
  }
}
