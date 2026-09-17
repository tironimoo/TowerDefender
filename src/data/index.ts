/**
 * Inhaltsverzeichnis.
 *
 * Alle Inhalte werden hier einmal eingesammelt, geprueft und als
 * unveraenderliche Nachschlagetabellen bereitgestellt.
 */

import type { Content, EnemyDef, LevelDef, TowerDef } from '@sim/model/types';
import { TOWER_DEFS } from './towers';
import { ENEMY_DEFS } from './enemies';
import { LEVEL_01 } from './levels/level-01';
import { validateContent } from './validate';

export const LEVEL_DEFS: readonly LevelDef[] = [LEVEL_01];

function toMap<T extends { id: string }>(defs: readonly T[], kind: string): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const def of defs) {
    if (map.has(def.id)) throw new Error(`${kind} doppelt vergeben: ${def.id}`);
    map.set(def.id, def);
  }
  return map;
}

let cached: Content | null = null;

/** Der gepruefte Inhalt des Spiels. Wird einmal aufgebaut und wiederverwendet. */
export function loadContent(): Content {
  if (cached !== null) return cached;

  const content: Content = {
    towers: toMap<TowerDef>(TOWER_DEFS, 'Turm'),
    enemies: toMap<EnemyDef>(ENEMY_DEFS, 'Gegner'),
    levels: toMap<LevelDef>(LEVEL_DEFS, 'Level'),
  };

  const problems = validateContent(content);
  if (problems.length > 0) {
    throw new Error(`Inhalte fehlerhaft:\n- ${problems.join('\n- ')}`);
  }

  cached = content;
  return content;
}

export { TOWER_DEFS, ENEMY_DEFS, LEVEL_01 };
