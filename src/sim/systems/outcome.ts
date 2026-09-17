/** Tode, durchgekommene Gegner und das Ende der Partie. */

import type { World } from '../model/world';
import { erzeugeGegner } from '../core/spawn';

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

    const def = world.content.enemies.get(enemy.defId);
    const verhalten = def?.behaviour;
    // Erst freigeben, dann die Splitter erzeugen. Sonst koennte ein Splitter
    // denselben Platz im Vorrat belegen und die Schleife durcheinanderbringen.
    const teilung =
      verhalten !== undefined && verhalten.kind === 'teilt'
        ? {
            childId: verhalten.childId,
            count: verhalten.count,
            waveNumber: enemy.waveNumber,
            routeIndex: enemy.routeIndex,
            travelled: enemy.travelled,
            goldFactor: enemy.gold / Math.max(1, def?.gold ?? 1),
          }
        : null;

    world.enemies.release(enemy);

    if (teilung !== null) {
      const kind = world.content.enemies.get(teilung.childId);
      for (let k = 0; k < teilung.count && kind !== undefined; k++) {
        erzeugeGegner(world, {
          defId: teilung.childId,
          waveNumber: teilung.waveNumber,
          routeIndex: teilung.routeIndex,
          travelled: Math.max(0, teilung.travelled - 0.3 * k),
          healthFactor: 1,
          goldFactor: teilung.goldFactor,
          speedFactor: world.difficulty.speedFactor * (world.mutator?.speedFactor ?? 1),
        });
      }
    }
  }
}

export function systemLeaks(world: World): void {
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || !enemy.reachedGoal) continue;

    const def = world.content.enemies.get(enemy.defId);
    world.lives -= def?.leakCost ?? 1;
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
