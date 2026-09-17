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

/**
 * Anteil der Reichweite, auf dem ein Turm auch unsichtbare Gegner trifft.
 *
 * Ohne diesen Rest waere der Spaehturm kein Vorteil, sondern eine Pflicht, und
 * eine Karte mit Unsichtbaren ohne ihn schlicht unspielbar. So bleibt der
 * Spaehturm sehr wertvoll, ohne den Loadout-Platz zu erzwingen.
 */
const SICHT_OHNE_SPAEHER = 0.45;

function sichtbarFuer(
  enemy: { invisible: boolean; revealed: boolean },
  distSquared: number,
  range: number,
): boolean {
  if (!enemy.invisible || enemy.revealed) return true;
  const nah = range * SICHT_OHNE_SPAEHER;
  return distSquared <= nah * nah;
}

export function systemTowers(world: World): void {
  const towers = world.towers.items;
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    if (tower === undefined || !tower.active) continue;

    // Ein gestoerter Turm laedt weiter, feuert aber nicht.
    if (tower.cooldown > 0) {
      tower.cooldown = Math.max(0, tower.cooldown - SECONDS_PER_TICK);
    }
    if (tower.stunTicks > 0 || tower.cooldown > 0) continue;

    const def = world.content.towers.get(tower.defId);
    if (def === undefined || def.fireRate <= 0 || tower.fireRate <= 0) continue;

    const target = selectTarget(world, tower, def);
    if (target === null) continue;

    tower.heading = (Math.atan2(target.x - tower.x, -(target.y - tower.y)) * 180) / Math.PI;
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

    const distSquared = distanceSquared(tower.x, tower.y, enemy.x, enemy.y);
    if (distSquared > rangeSquared) continue;
    if (!sichtbarFuer(enemy, distSquared, tower.range)) continue;

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
      return enemy.health + enemy.shield;
    case 'schwaechster':
      return -(enemy.health + enemy.shield);
    case 'naechster':
      return -distSquared;
  }
}

function fire(world: World, tower: Tower, def: TowerDef, target: Enemy): void {
  world.events.push({
    type: 'schuss',
    towerId: tower.id,
    towerDefId: def.id,
    x: tower.x,
    y: tower.y,
    targetX: target.x,
    targetY: target.y,
  });

  const knockback = def.special.kind === 'rueckstoss' ? def.special.distance : 0;

  if (def.special.kind === 'kette') {
    kettenschlag(world, tower, def, target, def.special.jumps, def.special.falloff);
    return;
  }

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
      knockback,
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
  projectile.model = def.projectileModel;
  projectile.effect = def.onHit;
}

/**
 * Kettenblitz.
 *
 * Springt vom Ziel auf immer weitere Gegner, jeder Sprung schwaecher. Die
 * Sprungweite ist die halbe Turmreichweite, das haelt Ketten lokal und macht
 * dichte Schwaerme zum bevorzugten Ziel.
 */
function kettenschlag(
  world: World,
  tower: Tower,
  def: TowerDef,
  start: Enemy,
  jumps: number,
  falloff: number,
): void {
  const enemies = world.enemies.items;
  const getroffen = new Set<number>();
  const sprungweiteQuadrat = (tower.range * 0.55) * (tower.range * 0.55);

  let aktuell: Enemy | null = start;
  let schaden = tower.damage;

  for (let sprung = 0; sprung <= jumps && aktuell !== null; sprung++) {
    getroffen.add(aktuell.id);
    queueImpact(world, {
      x: aktuell.x,
      y: aktuell.y,
      primary: aktuell,
      damage: schaden,
      damageType: def.damageType,
      armorPierce: def.armorPierce,
      splashRadius: 0,
      towerId: tower.id,
      towerDefId: def.id,
      effect: def.onHit,
      targetsAir: def.targetsAir,
      knockback: 0,
    });

    const von = aktuell;
    let naechstes: Enemy | null = null;
    let bestDistanz = Number.POSITIVE_INFINITY;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;
      if (getroffen.has(enemy.id)) continue;
      if (enemy.flying && !def.targetsAir) continue;
      if (enemy.invisible && !enemy.revealed) continue;
      const d = distanceSquared(von.x, von.y, enemy.x, enemy.y);
      if (d > sprungweiteQuadrat) continue;
      if (d < bestDistanz || (d === bestDistanz && naechstes !== null && enemy.id < naechstes.id)) {
        bestDistanz = d;
        naechstes = enemy;
      }
    }

    if (naechstes !== null) {
      world.events.push({
        type: 'kettenblitz',
        vonX: von.x,
        vonY: von.y,
        nachX: naechstes.x,
        nachY: naechstes.y,
      });
    }
    aktuell = naechstes;
    schaden *= 1 - falloff;
  }
}
