/** Tode, durchgekommene Gegner und das Ende der Partie. */

import type { World } from '../model/world';

export function systemDeaths(world: World): void {
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;
    if (enemy.health > 0) continue;

    world.gold += enemy.gold;
    world.stats.goldEarned += enemy.gold;
    world.stats.killed += 1;
    world.stats.killsByEnemy.set(enemy.defId, (world.stats.killsByEnemy.get(enemy.defId) ?? 0) + 1);

    world.events.push({
      type: 'gegner-gestorben',
      enemyId: enemy.id,
      defId: enemy.defId,
      x: enemy.x,
      y: enemy.y,
      gold: enemy.gold,
    });
    world.enemies.release(enemy);
  }
}

export function systemLeaks(world: World): void {
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || !enemy.reachedGoal) continue;

    world.lives -= 1;
    world.stats.leaked += 1;
    world.stats.leaksByEnemy.set(enemy.defId, (world.stats.leaksByEnemy.get(enemy.defId) ?? 0) + 1);

    world.events.push({ type: 'gegner-durch', enemyId: enemy.id, defId: enemy.defId });
    world.enemies.release(enemy);
  }
}

export function systemWinLose(world: World): void {
  if (world.status === 'gewonnen' || world.status === 'verloren') return;

  if (world.lives <= 0) {
    world.lives = 0;
    world.status = 'verloren';
    world.events.push({ type: 'verloren' });
    return;
  }

  if (world.wavesCleared >= world.waveCount) {
    world.status = 'gewonnen';
    world.events.push({ type: 'gewonnen' });
  }
}
