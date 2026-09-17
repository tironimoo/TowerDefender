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
 * Durchschlag hebt einen Teil des Widerstands auf, ebenso der Rueckstand aus
 * dem Alchemieturm. Eine vollstaendige Immunitaet bleibt jedoch immun. Sonst
 * waere die Regel aus dem Konzept gebrochen, dass aetherische Gegner nur
 * arkanen Schaden erleiden.
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

    if (order.knockback > 0) {
      enemy.travelled = Math.max(0, enemy.travelled - order.knockback);
    }

    if (order.amount <= 0) continue;
    if (enemy.invulnerableTicks > 0) continue;

    const def = world.content.enemies.get(enemy.defId);
    if (def !== undefined && def.immun.includes(order.damageType)) {
      world.events.push({
        type: 'treffer',
        enemyId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        damage: 0,
        damageType: order.damageType,
        abgeprallt: true,
      });
      continue;
    }

    const pierce = Math.min(1, order.armorPierce + enemy.armorShred);
    const factor = resistanceFactor(enemy.armor, order.damageType, pierce);
    const roh = order.amount * factor * (1 + enemy.damageAmp);
    if (roh <= 0) {
      world.events.push({
        type: 'treffer',
        enemyId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        damage: 0,
        damageType: order.damageType,
        abgeprallt: true,
      });
      continue;
    }

    // Erst der Schild, dann die Lebenspunkte.
    let rest = roh;
    let angerichtet = 0;
    if (enemy.shield > 0) {
      const amSchild = Math.min(enemy.shield, rest);
      enemy.shield -= amSchild;
      rest -= amSchild;
      angerichtet += amSchild;
    }
    if (rest > 0) {
      const amLeben = Math.min(enemy.health, rest);
      enemy.health -= amLeben;
      angerichtet += amLeben;
    }
    if (angerichtet <= 0) continue;

    if (order.towerDefId !== '') {
      const previous = world.stats.damageByTower.get(order.towerDefId) ?? 0;
      world.stats.damageByTower.set(order.towerDefId, previous + angerichtet);
    }

    world.events.push({
      type: 'treffer',
      enemyId: enemy.id,
      x: enemy.x,
      y: enemy.y,
      damage: angerichtet,
      damageType: order.damageType,
      abgeprallt: false,
    });
  }

  queue.length = 0;
}
