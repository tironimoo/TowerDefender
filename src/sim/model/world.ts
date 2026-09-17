/** Der gesamte Zustand einer laufenden Partie. */

import type { Pool } from '@shared/pool';
import type { Rng } from '../core/rng';
import type {
  Boni,
  Content,
  DamageOrder,
  DifficultyMods,
  Enemy,
  LevelDef,
  MutatorDef,
  Projectile,
  Route,
  RunStats,
  RunStatus,
  SimEvent,
  SpawnOrder,
  Tower,
} from './types';

export interface World {
  tick: number;
  status: RunStatus;

  readonly rng: Rng;
  readonly content: Content;
  readonly level: LevelDef;
  readonly routes: readonly Route[];
  readonly difficulty: DifficultyMods;
  readonly boni: Boni;
  readonly mutator: MutatorDef | null;
  /** Erlaubte Tuerme. Leer bedeutet: alle. */
  readonly loadout: readonly string[];

  gold: number;
  lives: number;

  /** Wie viele Wellen bereits gestartet wurden. */
  wavesStarted: number;
  /** Wie viele Wellen vollstaendig abgeraeumt sind. */
  wavesCleared: number;
  readonly waveCount: number;
  /** Sekunden bis zur naechsten Welle. Negativ bedeutet: wartet auf Befehl. */
  waveTimer: number;

  readonly enemies: Pool<Enemy>;
  readonly towers: Pool<Tower>;
  readonly projectiles: Pool<Projectile>;
  readonly spawns: Pool<SpawnOrder>;

  /** Schaden wird gesammelt und erst im Schadenssystem aufgeloest. */
  readonly damageQueue: DamageOrder[];
  /** Ereignisse eines Schrittes. Werden von aussen gelesen und geleert. */
  readonly events: SimEvent[];

  readonly occupiedSlots: Map<number, number>;
  nextEntityId: number;
  readonly stats: RunStats;
}
