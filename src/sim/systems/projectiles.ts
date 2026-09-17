/** Geschosse fliegen, treffen und melden Schaden an das Schadenssystem. */

import type { DamageOrder, EffectSpec, Enemy } from '../model/types';
import { SECONDS_PER_TICK } from '../model/types';
import type { World } from '../model/world';
import { distanceSquared } from '@shared/math';
import { findEnemy } from '../core/world';

export interface Impact {
  readonly x: number;
  readonly y: number;
  /** Das eigentliche Ziel. Null, wenn es vor dem Einschlag gestorben ist. */
  readonly primary: Enemy | null;
  readonly damage: number;
  readonly damageType: DamageOrder['damageType'];
  readonly armorPierce: number;
  readonly splashRadius: number;
  readonly towerId: number;
  readonly towerDefId: string;
  readonly effect: EffectSpec;
  readonly targetsAir: boolean;
  readonly knockback: number;
}

/**
 * Wandelt einen Einschlag in Schadensauftraege um.
 * Bei Flaechenschaden wird jeder Gegner im Radius voll getroffen.
 */
export function queueImpact(world: World, impact: Impact): void {
  if (impact.splashRadius <= 0) {
    if (impact.primary === null || !impact.primary.active) return;
    push(world, impact, impact.primary);
    return;
  }

  const radiusSquared = impact.splashRadius * impact.splashRadius;
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;
    if (enemy.flying && !impact.targetsAir) continue;
    if (distanceSquared(impact.x, impact.y, enemy.x, enemy.y) > radiusSquared) continue;
    push(world, impact, enemy);
  }
}

function push(world: World, impact: Impact, enemy: Enemy): void {
  world.damageQueue.push({
    enemyPoolIndex: enemy.poolIndex,
    amount: impact.damage,
    damageType: impact.damageType,
    armorPierce: impact.armorPierce,
    towerId: impact.towerId,
    towerDefId: impact.towerDefId,
    effect: impact.effect,
    knockback: impact.knockback,
  });
}

export function systemProjectiles(world: World): void {
  const projectiles = world.projectiles.items;

  for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i];
    if (projectile === undefined || !projectile.active) continue;

    const target = findEnemy(world, projectile.targetId);
    if (target !== null && !target.reachedGoal) {
      projectile.targetX = target.x;
      projectile.targetY = target.y;
    } else if (projectile.splashRadius <= 0) {
      // Einzelziel ohne Ziel: das Geschoss verpufft.
      world.projectiles.release(projectile);
      continue;
    }

    const stepLength = projectile.speed * SECONDS_PER_TICK;
    const dx = projectile.targetX - projectile.x;
    const dy = projectile.targetY - projectile.y;
    const remaining = Math.hypot(dx, dy);

    if (remaining <= stepLength) {
      projectile.x = projectile.targetX;
      projectile.y = projectile.targetY;
      queueImpact(world, {
        x: projectile.x,
        y: projectile.y,
        primary: target,
        damage: projectile.damage,
        damageType: projectile.damageType,
        armorPierce: projectile.armorPierce,
        splashRadius: projectile.splashRadius,
        towerId: projectile.towerId,
        towerDefId: projectile.towerDefId,
        effect: projectile.effect,
        targetsAir: projectile.targetsAir,
        knockback: 0,
      });
      world.projectiles.release(projectile);
      continue;
    }

    projectile.x += (dx / remaining) * stepLength;
    projectile.y += (dy / remaining) * stepLength;
  }
}
