/**
 * Ein Level ohne Grafik durchrechnen.
 *
 * Dies ist der Kern der Balancing-Messung. Ein Durchlauf liefert, wie oft
 * gewonnen wurde, wann Gegner durchkamen und welcher Turm welchen Anteil am
 * Schaden hatte.
 */

import type { Boni, Content, Difficulty, World } from '@sim/index';
import { createWorld, step, drainEvents, TICKS_PER_SECOND } from '@sim/index';
import { AutoPlayer } from './autoplayer';

export interface SimulateOptions {
  readonly content: Content;
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly loadout: readonly string[];
  readonly seed: number;
  /** Dauerhafte Verbesserungen, die der Spieler an dieser Stelle haette. */
  readonly boni?: Boni;
  /** Jede Welle sofort starten. Misst die obere statt der unteren Schranke. */
  readonly rushWaves?: boolean;
  /** Abbruch, damit ein Fehler nicht in eine Endlosschleife laeuft. */
  readonly maxSeconds?: number;
}

export interface SimulateResult {
  readonly status: World['status'];
  readonly won: boolean;
  readonly livesLeft: number;
  readonly wavesCleared: number;
  readonly waveCount: number;
  readonly seconds: number;
  readonly killed: number;
  readonly leaked: number;
  readonly goldEarned: number;
  readonly goldSpent: number;
  readonly damageByTower: ReadonlyMap<string, number>;
  readonly leaksByEnemy: ReadonlyMap<string, number>;
  /** Wellennummer, in der zuerst ein Gegner durchkam. Null, wenn keiner durchkam. */
  readonly firstLeakWave: number | null;
}

export function simulate(options: SimulateOptions): SimulateResult {
  const world = createWorld({
    content: options.content,
    levelId: options.levelId,
    difficulty: options.difficulty,
    seed: options.seed,
    loadout: options.loadout,
    ...(options.boni === undefined ? {} : { boni: options.boni }),
  });

  const player = new AutoPlayer(world, {
    loadout: options.loadout,
    rushWaves: options.rushWaves ?? false,
  });
  const maxTicks = Math.round((options.maxSeconds ?? 1800) * TICKS_PER_SECOND);
  let firstLeakWave: number | null = null;

  while (world.status !== 'gewonnen' && world.status !== 'verloren' && world.tick < maxTicks) {
    player.update(world);
    step(world);

    for (const event of drainEvents(world)) {
      if (event.type === 'gegner-durch' && firstLeakWave === null) {
        firstLeakWave = world.wavesStarted;
      }
    }
  }

  return {
    status: world.status,
    won: world.status === 'gewonnen',
    livesLeft: world.lives,
    wavesCleared: world.wavesCleared,
    waveCount: world.waveCount,
    seconds: world.tick / TICKS_PER_SECOND,
    killed: world.stats.killed,
    leaked: world.stats.leaked,
    goldEarned: world.stats.goldEarned,
    goldSpent: world.stats.goldSpent,
    damageByTower: world.stats.damageByTower,
    leaksByEnemy: world.stats.leaksByEnemy,
    firstLeakWave,
  };
}

/** Anteil jedes Turms am Gesamtschaden, absteigend sortiert. */
export function damageShare(result: SimulateResult): { id: string; share: number }[] {
  let total = 0;
  for (const value of result.damageByTower.values()) total += value;
  if (total === 0) return [];
  return [...result.damageByTower.entries()]
    .map(([id, value]) => ({ id, share: value / total }))
    .sort((a, b) => b.share - a.share);
}
