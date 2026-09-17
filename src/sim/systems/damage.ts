/**
 * Schaden aufloesen.
 *
 * Alle Quellen sammeln ihre Auftraege waehrend eines Schrittes in einer
 * Warteschlange. Erst hier wird gerechnet. Dadurch ist die Reihenfolge fest
 * und das Ergebnis reproduzierbar.
 */

import type { ArmorType, DamageType } from '../model/types';
import { RESISTANCE } from '../model/types';
import type { World } from '../model/world';
import { applyEffect } from './effects';

/**
 * Wirkungsfaktor einer Schadensart auf eine Panzerung.
 *
 * Durchschlag hebt einen Teil des Widerstands auf. Eine vollstaendige
 * Immunitaet bleibt jedoch immun. Sonst waere die Regel aus dem Konzept
 * gebrochen, dass ätherische Gegner nur arkanen Schaden erleiden.
 */
export function resistanceFactor(
  armor: ArmorType,
  damageType: DamageType,
  armorPierce: number,
): number {
  const base = RESISTANCE[armor][damageType];
  if (base <= 0) return 0;
  if (base >= 1) return base;
  const pierce = Math.min(1, Math.max(0, armorPierce));
  return base + (1 - base) * pierce;
}

export function systemDamage(world: World): void {
  const queue = world.damageQueue;

  for (let i = 0; i < queue.length; i++) {
    const order = queue[i];
    if (order === undefined) continue;

    const enemy = world.enemies.items[order.enemyPoolIndex];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;

    // Effekte wirken auch dann, wenn der Schaden abprallt.
    applyEffect(enemy, order.effect, order.towerDefId);

    if (order.amount <= 0) continue;

    const factor = resistanceFactor(enemy.armor, order.damageType, order.armorPierce);
    const dealt = Math.min(enemy.health, order.amount * factor);
    if (dealt <= 0) continue;

    enemy.health -= dealt;

    if (order.towerDefId !== '') {
      const previous = world.stats.damageByTower.get(order.towerDefId) ?? 0;
      world.stats.damageByTower.set(order.towerDefId, previous + dealt);
    }

    world.events.push({
      type: 'treffer',
      enemyId: enemy.id,
      x: enemy.x,
      y: enemy.y,
      damage: dealt,
      damageType: order.damageType,
    });
  }

  queue.length = 0;
}
