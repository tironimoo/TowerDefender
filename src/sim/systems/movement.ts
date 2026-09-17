/** Gegner bewegen sich am Weg entlang. */

import { SECONDS_PER_TICK } from '../model/types';
import type { World } from '../model/world';
import { positionOnRoute } from '../core/route';

const scratch = { x: 0, y: 0 };
const voraus = { x: 0, y: 0 };

export function systemMovement(world: World): void {
  const enemies = world.enemies.items;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy === undefined || !enemy.active || enemy.reachedGoal) continue;

    const route = world.routes[enemy.routeIndex];
    if (route === undefined) continue;

    const speed = enemy.baseSpeed * (1 - enemy.slowFactor);
    enemy.travelled += speed * SECONDS_PER_TICK;

    if (enemy.travelled >= enemy.routeLength) {
      enemy.travelled = enemy.routeLength;
      enemy.reachedGoal = true;
    }

    positionOnRoute(route, enemy.travelled, enemy.flying, scratch);
    // Blickrichtung aus dem naechsten Wegstueck, damit sich Gegner drehen.
    positionOnRoute(
      route,
      Math.min(enemy.routeLength, enemy.travelled + 0.35),
      enemy.flying,
      voraus,
    );
    const dx = voraus.x - scratch.x;
    const dy = voraus.y - scratch.y;
    if (dx !== 0 || dy !== 0) {
      enemy.heading = (Math.atan2(dx, -dy) * 180) / Math.PI;
    }

    enemy.x = scratch.x;
    enemy.y = scratch.y;
  }
}
