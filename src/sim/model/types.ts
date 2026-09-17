/** Alle Typen der Simulation. Kein Verhalten, nur Form. */

import type { Vec2 } from '@shared/math';

/** Die Simulation rechnet in festen Schritten. Siehe docs/03-architektur.md. */
export const TICKS_PER_SECOND = 60;
export const SECONDS_PER_TICK = 1 / TICKS_PER_SECOND;

export type DamageType = 'physisch' | 'feuer' | 'arkan';
export type ArmorType = 'leder' | 'eisen' | 'obsidian' | 'aetherisch';
export type TargetPolicy = 'erster' | 'letzter' | 'staerkster' | 'schwaechster' | 'naechster';
export type Difficulty = 'normal' | 'hart' | 'albtraum';
export type RunStatus = 'vorbereitung' | 'laufend' | 'gewonnen' | 'verloren';

/**
 * Wirkung einer Schadensart auf eine Panzerung, als Faktor.
 * Entspricht der Tabelle in docs/01-konzept.md.
 */
export const RESISTANCE: Readonly<Record<ArmorType, Readonly<Record<DamageType, number>>>> = {
  leder: { physisch: 1.0, feuer: 1.0, arkan: 1.0 },
  eisen: { physisch: 0.4, feuer: 1.0, arkan: 1.1 },
  obsidian: { physisch: 0.9, feuer: 0.2, arkan: 1.1 },
  aetherisch: { physisch: 0.0, feuer: 0.0, arkan: 1.0 },
};

// ---------------------------------------------------------------------------
// Inhaltsdefinitionen. Kommen aus src/data und sind unveraenderlich.
// ---------------------------------------------------------------------------

export interface EffectSpec {
  /** Anteil, um den das Tempo sinkt. 0 bedeutet keine Verlangsamung. */
  readonly slowFactor: number;
  readonly slowDuration: number;
  /** Schaden pro Sekunde durch Brand. 0 bedeutet kein Brand. */
  readonly burnDps: number;
  readonly burnDuration: number;
}

export const NO_EFFECT: EffectSpec = {
  slowFactor: 0,
  slowDuration: 0,
  burnDps: 0,
  burnDuration: 0,
};

export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  /** Kacheln pro Sekunde. */
  readonly speed: number;
  readonly armor: ArmorType;
  readonly gold: number;
  readonly flying: boolean;
  readonly invisible: boolean;
}

export interface TowerUpgradeDef {
  /** Kosten als Anteil des Grundpreises. */
  readonly costFactor: number;
  /** Zuwachs auf den Grundschaden, 0.55 bedeutet plus 55 Prozent. */
  readonly damageBonus: number;
  readonly rangeBonus: number;
}

export interface TowerDef {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly damage: number;
  /** Schuesse pro Sekunde. */
  readonly fireRate: number;
  /** Reichweite in Kacheln. */
  readonly range: number;
  readonly damageType: DamageType;
  readonly targetsAir: boolean;
  /** Anteil des Widerstands, der durchschlagen wird. 0 bis 1. */
  readonly armorPierce: number;
  /** Radius des Flaechenschadens in Kacheln. 0 bedeutet Einzelziel. */
  readonly splashRadius: number;
  /** Kacheln pro Sekunde. 0 bedeutet Soforttreffer ohne Flugzeit. */
  readonly projectileSpeed: number;
  readonly onHit: EffectSpec;
  readonly defaultPolicy: TargetPolicy;
  readonly upgrades: readonly TowerUpgradeDef[];
}

export interface WaveGroupDef {
  readonly enemyId: string;
  readonly count: number;
  /** Sekunden zwischen zwei Gegnern dieser Gruppe. */
  readonly spacing: number;
  /** Sekunden nach Wellenstart, bis der erste Gegner erscheint. */
  readonly delay: number;
  readonly pathIndex: number;
}

export interface WaveDef {
  readonly groups: readonly WaveGroupDef[];
  readonly reward: number;
}

export interface LevelDef {
  readonly id: string;
  readonly name: string;
  readonly paths: readonly (readonly Vec2[])[];
  readonly buildSlots: readonly Vec2[];
  readonly startGold: number;
  readonly lives: number;
  /** Sekunden zwischen zwei Wellen, wenn nicht vorzeitig gestartet wird. */
  readonly waveInterval: number;
  readonly waves: readonly WaveDef[];
}

export interface Content {
  readonly towers: ReadonlyMap<string, TowerDef>;
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  readonly levels: ReadonlyMap<string, LevelDef>;
}

export interface DifficultyMods {
  readonly healthFactor: number;
  readonly speedFactor: number;
  readonly goldFactor: number;
  readonly extraWaves: number;
}

export const DIFFICULTY: Readonly<Record<Difficulty, DifficultyMods>> = {
  normal: { healthFactor: 1.0, speedFactor: 1.0, goldFactor: 1.0, extraWaves: 0 },
  hart: { healthFactor: 1.6, speedFactor: 1.1, goldFactor: 0.9, extraWaves: 4 },
  albtraum: { healthFactor: 2.6, speedFactor: 1.2, goldFactor: 0.8, extraWaves: 8 },
};

// ---------------------------------------------------------------------------
// Laufzeitzustand. Veraenderlich, aus Vorraeten, ohne optionale Felder.
// ---------------------------------------------------------------------------

/** Vorberechneter Weg. Entsteht einmal beim Erzeugen der Welt. */
export interface Route {
  readonly points: readonly Vec2[];
  /** cumulative[i] ist die Weglaenge bis points[i]. */
  readonly cumulative: readonly number[];
  readonly totalLength: number;
  /** Luftlinie vom ersten zum letzten Punkt, fuer Flieger. */
  readonly straightLength: number;
}

export interface Enemy {
  active: boolean;
  poolIndex: number;
  id: number;
  defId: string;
  waveNumber: number;
  routeIndex: number;
  /** Zurueckgelegte Strecke auf der Route, in Kacheln. */
  travelled: number;
  /** Laenge der eigenen Route, damit Fortschritte vergleichbar sind. */
  routeLength: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  baseSpeed: number;
  armor: ArmorType;
  gold: number;
  flying: boolean;
  invisible: boolean;
  /** Staerkste aktive Verlangsamung, 0 bis 1. */
  slowFactor: number;
  slowTicksLeft: number;
  burnDps: number;
  burnTicksLeft: number;
  /** Turmtyp, der den Brand gelegt hat. Nur fuer die Schadensstatistik. */
  burnSourceDefId: string;
  reachedGoal: boolean;
}

export interface Tower {
  active: boolean;
  poolIndex: number;
  id: number;
  defId: string;
  slotIndex: number;
  x: number;
  y: number;
  /** 0 ist die Grundstufe, danach 1 bis 3. */
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  /** Sekunden bis zum naechsten Schuss. */
  cooldown: number;
  policy: TargetPolicy;
  /** Summe aller Ausgaben, Grundlage fuer den Verkaufswert. */
  invested: number;
  damageDealt: number;
}

export interface Projectile {
  active: boolean;
  poolIndex: number;
  id: number;
  x: number;
  y: number;
  targetId: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  damageType: DamageType;
  armorPierce: number;
  splashRadius: number;
  /** Ob der Einschlag auch Flieger trifft. Kommt vom Turmtyp. */
  targetsAir: boolean;
  towerId: number;
  towerDefId: string;
  effect: EffectSpec;
}

export interface SpawnOrder {
  active: boolean;
  poolIndex: number;
  enemyId: string;
  remaining: number;
  /** Tick, an dem der naechste Gegner erscheint. */
  nextTick: number;
  spacingTicks: number;
  routeIndex: number;
  waveNumber: number;
  healthFactor: number;
  goldFactor: number;
  speedFactor: number;
}

export interface DamageOrder {
  enemyPoolIndex: number;
  amount: number;
  damageType: DamageType;
  armorPierce: number;
  towerId: number;
  towerDefId: string;
  effect: EffectSpec;
}

// ---------------------------------------------------------------------------
// Befehle hinein, Ereignisse heraus.
// ---------------------------------------------------------------------------

export type SimCommand =
  | { readonly type: 'bauen'; readonly slotIndex: number; readonly towerDefId: string }
  | { readonly type: 'ausbauen'; readonly towerId: number }
  | { readonly type: 'verkaufen'; readonly towerId: number }
  | { readonly type: 'ziel-setzen'; readonly towerId: number; readonly policy: TargetPolicy }
  | { readonly type: 'welle-starten' };

export type SimEvent =
  | { readonly type: 'gegner-erschienen'; readonly enemyId: number; readonly defId: string }
  | {
      readonly type: 'schuss';
      readonly towerId: number;
      readonly x: number;
      readonly y: number;
      readonly targetX: number;
      readonly targetY: number;
    }
  | {
      readonly type: 'treffer';
      readonly enemyId: number;
      readonly x: number;
      readonly y: number;
      readonly damage: number;
      readonly damageType: DamageType;
    }
  | {
      readonly type: 'gegner-gestorben';
      readonly enemyId: number;
      readonly defId: string;
      readonly x: number;
      readonly y: number;
      readonly gold: number;
    }
  | { readonly type: 'gegner-durch'; readonly enemyId: number; readonly defId: string }
  | { readonly type: 'welle-gestartet'; readonly wave: number; readonly bonus: number }
  | { readonly type: 'welle-geschafft'; readonly wave: number; readonly reward: number }
  | {
      readonly type: 'turm-gebaut';
      readonly towerId: number;
      readonly defId: string;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'turm-ausgebaut'; readonly towerId: number; readonly level: number }
  | { readonly type: 'turm-verkauft'; readonly towerId: number; readonly refund: number }
  | { readonly type: 'befehl-abgelehnt'; readonly grund: string }
  | { readonly type: 'gewonnen' }
  | { readonly type: 'verloren' };

export interface RunStats {
  ticks: number;
  killed: number;
  leaked: number;
  goldEarned: number;
  goldSpent: number;
  /** Schaden je Turmtyp, fuer Balancing und spaeter fuer die Meisterschaft. */
  readonly damageByTower: Map<string, number>;
  readonly killsByEnemy: Map<string, number>;
  readonly leaksByEnemy: Map<string, number>;
}
