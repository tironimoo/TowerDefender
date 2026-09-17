/**
 * Inhaltsverzeichnis.
 *
 * Alle Inhalte werden hier einmal eingesammelt, geprueft und als
 * unveraenderliche Nachschlagetabellen bereitgestellt.
 */

import type { Content, EnemyDef, LevelDef, MutatorDef, TowerDef } from '@sim/model/types';
import { TOWER_DEFS } from './towers';
import { ENEMY_DEFS } from './enemies';
import { MUTATOR_DEFS } from './mutators';
import { LEVEL_DEFS, LEVEL_REIHENFOLGE } from './levels/index';
import { validateContent } from './validate';

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
    mutators: toMap<MutatorDef>(MUTATOR_DEFS, 'Mutator'),
    levelReihenfolge: LEVEL_REIHENFOLGE,
  };

  const problems = validateContent(content);
  if (problems.length > 0) {
    throw new Error(`Inhalte fehlerhaft:\n- ${problems.join('\n- ')}`);
  }

  cached = content;
  return content;
}

export { TOWER_DEFS, ENEMY_DEFS, MUTATOR_DEFS, LEVEL_DEFS, LEVEL_REIHENFOLGE };
