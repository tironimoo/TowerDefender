/**
 * Auren.
 *
 * Unterstuetzungstuerme wirken nicht durch Schuesse, sondern dauerhaft auf
 * ihren Umkreis. Ihre Wirkung wird jeden Schritt neu berechnet und nie
 * aufsummiert. Dadurch kann ein verkaufter Turm keine Wirkung hinterlassen,
 * und es gibt keinen Zustand, der auseinanderlaufen kann.
 */

import { distanceSquared } from '@shared/math';
import type { AuraEffect } from '../model/types';
import type { World } from '../model/world';

export function systemAuren(world: World): void {
  const towers = world.towers.items;
  const enemies = world.enemies.items;

  // Zuruecksetzen auf die Grundwerte.
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    if (tower === undefined || !tower.active) continue;
    tower.damage = tower.baseDamage;
    tower.range = tower.baseRange;
    tower.fireRate = tower.baseFireRate;
  }
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active) continue;
    enemy.armorShred = 0;
    enemy.damageAmp = 0;
    enemy.revealed = false;
  }

  for (let i = 0; i < towers.length; i++) {
    const quelle = towers[i];
    if (quelle === undefined || !quelle.active) continue;
    const def = world.content.towers.get(quelle.defId);
    if (def === undefined || def.special.kind !== 'aura') continue;

    const roh: AuraEffect = def.special.effect;
    // Die Meisterschaft verstaerkt die Wirkung einer Aura, nicht ihre Reichweite.
    const staerke = quelle.auraStaerke;
    const effect: AuraEffect = {
      ...roh,
      damageBonus: roh.damageBonus * staerke,
      rangeBonus: roh.rangeBonus * staerke,
      fireRateBonus: roh.fireRateBonus * staerke,
      armorShred: Math.min(0.95, roh.armorShred * staerke),
      damageAmp: roh.damageAmp * staerke,
    };
    const radiusQuadrat = quelle.range * quelle.range;

    if (effect.aufGegner || effect.reveal) {
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy === undefined || !enemy.active) continue;
        if (distanceSquared(quelle.x, quelle.y, enemy.x, enemy.y) > radiusQuadrat) continue;
        if (effect.reveal) enemy.revealed = true;
        if (!effect.aufGegner) continue;
        // Mehrere Alchemietuerme stapeln nicht, der staerkste gewinnt.
        enemy.armorShred = Math.max(enemy.armorShred, effect.armorShred);
        enemy.damageAmp = Math.max(enemy.damageAmp, effect.damageAmp);
      }
    }

    if (effect.aufGegner) continue;

    for (let j = 0; j < towers.length; j++) {
      const ziel = towers[j];
      if (ziel === undefined || !ziel.active || ziel === quelle) continue;
      // Ein Leuchtfeuer verstaerkt kein anderes Leuchtfeuer.
      if (ziel.defId === quelle.defId) continue;
      if (distanceSquared(quelle.x, quelle.y, ziel.x, ziel.y) > radiusQuadrat) continue;
      ziel.damage = Math.max(ziel.damage, ziel.baseDamage * (1 + effect.damageBonus));
      ziel.range = Math.max(ziel.range, ziel.baseRange * (1 + effect.rangeBonus));
      ziel.fireRate = Math.max(ziel.fireRate, ziel.baseFireRate * (1 + effect.fireRateBonus));
    }
  }
}
