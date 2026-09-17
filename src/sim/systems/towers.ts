/**
 * Zielauswahl und Feuern.
 *
 * Die Zielsuche laeuft linear ueber alle Gegner. Bei den Leistungszielen aus
 * docs/03-architektur.md, also bis 250 Gegner und wenigen Dutzend Tuermen,
 * reicht das deutlich. Ein Raster zur Nachbarschaftssuche kommt erst, wenn eine
 * Messung zeigt, dass es noetig ist.
 */

import type { Enemy, TargetPolicy, Tower, TowerDef } from '../model/types';
import { SECONDS_PER_TICK } from '../model/types';
import type { World } from '../model/world';
import { distanceSquared } from '@shared/math';
import { queueImpact } from './projectiles';

export function systemTowers(world: World): void {
  const towers = world.towers.items;
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    if (tower === undefined || !tower.active) continue;

    if (tower.cooldown > 0) {
      tower.cooldown = Math.max(0, tower.cooldown - SECONDS_PER_TICK);
      continue;
    }

    const def = world.content.towers.get(tower.defId);
    if (def === undefined || def.fireRate <= 0) continue;

    const target = selectTarget(world, tower, def);
    if (target === null) continue;

    fire(world, tower, def, target);
    tower.cooldown = 1 / tower.fireRate;
  }
}

export function selectTarget(world: World, tower: Tower, def: TowerDef): Enemy | null {
  const enemies = world.enemies.items;
  const rangeSquared = tower.range * tower.range;

  let best: Enemy | null = null;
  let bestScore = 0;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;
    if (enemy.flying && !def.targetsAir) continue;
    if (enemy.invisible) continue;

    const distSquared = distanceSquared(tower.x, tower.y, enemy.x, enemy.y);
    if (distSquared > rangeSquared) continue;

    const score = scoreFor(tower.policy, enemy, distSquared);
    if (best === null || score > bestScore || (score === bestScore && enemy.id < best.id)) {
      best = enemy;
      bestScore = score;
    }
  }

  return best;
}

/** Hoeherer Wert gewinnt. Bei Gleichstand entscheidet die kleinere Gegner-Id. */
function scoreFor(policy: TargetPolicy, enemy: Enemy, distSquared: number): number {
  const progress = enemy.routeLength === 0 ? 1 : enemy.travelled / enemy.routeLength;
  switch (policy) {
    case 'erster':
      return progress;
    case 'letzter':
      return -progress;
    case 'staerkster':
      return enemy.health;
    case 'schwaechster':
      return -enemy.health;
    case 'naechster':
      return -distSquared;
  }
}

function fire(world: World, tower: Tower, def: TowerDef, target: Enemy): void {
  world.events.push({
    type: 'schuss',
    towerId: tower.id,
    x: tower.x,
    y: tower.y,
    targetX: target.x,
    targetY: target.y,
  });

  if (def.projectileSpeed <= 0) {
    queueImpact(world, {
      x: target.x,
      y: target.y,
      primary: target,
      damage: tower.damage,
      damageType: def.damageType,
      armorPierce: def.armorPierce,
      splashRadius: def.splashRadius,
      towerId: tower.id,
      towerDefId: def.id,
      effect: def.onHit,
      targetsAir: def.targetsAir,
    });
    return;
  }

  const projectile = world.projectiles.acquire();
  projectile.id = world.nextEntityId++;
  projectile.x = tower.x;
  projectile.y = tower.y;
  projectile.targetId = target.id;
  projectile.targetX = target.x;
  projectile.targetY = target.y;
  projectile.speed = def.projectileSpeed;
  projectile.damage = tower.damage;
  projectile.damageType = def.damageType;
  projectile.armorPierce = def.armorPierce;
  projectile.splashRadius = def.splashRadius;
  projectile.targetsAir = def.targetsAir;
  projectile.towerId = tower.id;
  projectile.towerDefId = def.id;
  projectile.effect = def.onHit;
}
