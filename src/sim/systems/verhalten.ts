/**
 * Sonderverhalten der Gegner und Bossphasen.
 *
 * Jeder Gegner hat hoechstens eine Eigenschaft. Sie steht als Daten in der
 * Gegnerdefinition, hier steht nur ihre Umsetzung. Ein neuer Gegner braucht
 * deshalb in der Regel keine Zeile Code.
 */

import { distanceSquared } from '@shared/math';
import type { Enemy } from '../model/types';
import { SECONDS_PER_TICK, TICKS_PER_SECOND } from '../model/types';
import type { World } from '../model/world';
import { erzeugeGegner } from '../core/spawn';
import { goldFaktor } from './waves';

export function systemVerhalten(world: World): void {
  const enemies = world.enemies.items;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;

    if (enemy.invulnerableTicks > 0) enemy.invulnerableTicks -= 1;

    const def = world.content.enemies.get(enemy.defId);
    if (def === undefined) continue;

    if (def.boss !== null) bossPhase(world, enemy, def.boss.phasen);

    const verhalten = def.behaviour;
    switch (verhalten.kind) {
      case 'keines':
      case 'teilt':
        break;

      case 'rast': {
        if (!enemy.behaviourFired && enemy.health <= enemy.maxHealth * verhalten.threshold) {
          enemy.behaviourFired = true;
          enemy.baseSpeed *= verhalten.factor;
        }
        break;
      }

      case 'sprengt': {
        if (enemy.behaviourFired) break;
        const turm = naechsterTurm(world, enemy, verhalten.radius);
        if (turm === null) break;
        enemy.behaviourFired = true;
        stoereTuerme(world, enemy.x, enemy.y, verhalten.radius, verhalten.duration);
        break;
      }

      case 'stoert': {
        if (enemy.behaviourTicks > 0) {
          enemy.behaviourTicks -= 1;
          break;
        }
        enemy.behaviourTicks = Math.round(verhalten.interval * TICKS_PER_SECOND);
        if (naechsterTurm(world, enemy, verhalten.radius) === null) break;
        stoereTuerme(world, enemy.x, enemy.y, verhalten.radius, verhalten.duration);
        break;
      }

      case 'schildet': {
        if (enemy.behaviourTicks > 0) {
          enemy.behaviourTicks -= 1;
          break;
        }
        enemy.behaviourTicks = Math.round(verhalten.interval * TICKS_PER_SECOND);
        const radiusQuadrat = verhalten.radius * verhalten.radius;
        for (let j = 0; j < enemies.length; j++) {
          const ziel = enemies[j];
          if (ziel === undefined || !ziel.active || ziel.reachedGoal) continue;
          if (distanceSquared(enemy.x, enemy.y, ziel.x, ziel.y) > radiusQuadrat) continue;
          const neu = Math.min(ziel.maxShield + verhalten.shield, ziel.shield + verhalten.shield);
          if (neu <= ziel.shield) continue;
          ziel.maxShield = Math.max(ziel.maxShield, neu);
          ziel.shield = neu;
          world.events.push({ type: 'schild-gegeben', enemyId: ziel.id });
        }
        break;
      }

      case 'heilt': {
        if (enemy.behaviourTicks > 0) {
          enemy.behaviourTicks -= 1;
          break;
        }
        enemy.behaviourTicks = Math.round(verhalten.interval * TICKS_PER_SECOND);
        const radiusQuadrat = verhalten.radius * verhalten.radius;
        let schwaechstes: Enemy | null = null;
        let fehlend = 0;
        for (let j = 0; j < enemies.length; j++) {
          const ziel = enemies[j];
          if (ziel === undefined || !ziel.active || ziel.reachedGoal) continue;
          if (distanceSquared(enemy.x, enemy.y, ziel.x, ziel.y) > radiusQuadrat) continue;
          const luecke = ziel.maxHealth - ziel.health;
          if (luecke > fehlend) {
            fehlend = luecke;
            schwaechstes = ziel;
          }
        }
        if (schwaechstes === null || fehlend <= 0) break;
        const menge = Math.min(fehlend, verhalten.amount);
        schwaechstes.health += menge;
        world.events.push({ type: 'geheilt', enemyId: schwaechstes.id, menge });
        break;
      }

      case 'springt': {
        if (enemy.behaviourTicks > 0) {
          enemy.behaviourTicks -= 1;
          break;
        }
        enemy.behaviourTicks = Math.round(verhalten.interval * TICKS_PER_SECOND);
        enemy.travelled = Math.min(enemy.routeLength, enemy.travelled + verhalten.distance);
        world.events.push({ type: 'gesprungen', enemyId: enemy.id });
        break;
      }
    }
  }
}

function bossPhase(
  world: World,
  enemy: Enemy,
  phasen: readonly {
    abLebensanteil: number;
    armor: Enemy['armor'];
    speedFactor: number;
    unverwundbar: number;
    ruft: { enemyId: string; count: number } | null;
    stoert: { radius: number; duration: number } | null;
  }[],
): void {
  const anteil = enemy.maxHealth === 0 ? 0 : enemy.health / enemy.maxHealth;
  let ziel = enemy.bossPhase;
  for (let i = enemy.bossPhase + 1; i < phasen.length; i++) {
    const phase = phasen[i];
    if (phase !== undefined && anteil <= phase.abLebensanteil) ziel = i;
  }
  if (ziel === enemy.bossPhase) return;

  const phase = phasen[ziel];
  if (phase === undefined) return;

  enemy.bossPhase = ziel;
  enemy.armor = phase.armor;
  const def = world.content.enemies.get(enemy.defId);
  if (def !== undefined) {
    enemy.baseSpeed = def.speed * phase.speedFactor * world.difficulty.speedFactor;
  }
  enemy.invulnerableTicks = Math.round(phase.unverwundbar * TICKS_PER_SECOND);

  if (phase.stoert !== null) {
    stoereTuerme(world, enemy.x, enemy.y, phase.stoert.radius, phase.stoert.duration);
  }
  if (phase.ruft !== null) {
    for (let i = 0; i < phase.ruft.count; i++) {
      erzeugeGegner(world, {
        defId: phase.ruft.enemyId,
        waveNumber: enemy.waveNumber,
        routeIndex: enemy.routeIndex,
        travelled: Math.max(0, enemy.travelled - 1 - i * 0.4),
        healthFactor: 1,
        goldFactor: goldFaktor(world, enemy.waveNumber),
        speedFactor: world.difficulty.speedFactor,
      });
    }
  }

  world.events.push({ type: 'bossphase', enemyId: enemy.id, phase: ziel });
}

function naechsterTurm(world: World, enemy: Enemy, radius: number) {
  const towers = world.towers.items;
  const radiusQuadrat = radius * radius;
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    if (tower === undefined || !tower.active || tower.stunTicks > 0) continue;
    if (distanceSquared(enemy.x, enemy.y, tower.x, tower.y) > radiusQuadrat) continue;
    return tower;
  }
  return null;
}

export function stoereTuerme(
  world: World,
  x: number,
  y: number,
  radius: number,
  dauer: number,
): void {
  const towers = world.towers.items;
  const radiusQuadrat = radius * radius;
  const ticks = Math.round(dauer / SECONDS_PER_TICK);
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    if (tower === undefined || !tower.active) continue;
    if (distanceSquared(x, y, tower.x, tower.y) > radiusQuadrat) continue;
    if (tower.stunTicks >= ticks) continue;
    tower.stunTicks = ticks;
    world.events.push({ type: 'turm-gestoert', towerId: tower.id, x: tower.x, y: tower.y });
  }
}
