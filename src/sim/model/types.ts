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
export type Region = 'wald' | 'glut' | 'leere';

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

/**
 * Sonderverhalten eines Gegners.
 *
 * Ein Gegner, der nur mehr aushaelt, ist kein neuer Gegner. Deshalb hat fast
 * jeder Gegner genau eine Eigenschaft, die den Spieler zu einer Antwort zwingt.
 */
export type EnemyBehaviour =
  | { readonly kind: 'keines' }
  /** Zerfaellt beim Tod in kleinere Gegner. */
  | { readonly kind: 'teilt'; readonly childId: string; readonly count: number }
  /** Gibt Gegnern im Umkreis einen absorbierenden Schild. */
  | {
      readonly kind: 'schildet';
      readonly radius: number;
      readonly shield: number;
      readonly interval: number;
    }
  /** Heilt den am staerksten verletzten Gegner in Reichweite. */
  | {
      readonly kind: 'heilt';
      readonly radius: number;
      readonly amount: number;
      readonly interval: number;
    }
  /** Ueberspringt in Abstaenden ein Stueck des Weges. */
  | { readonly kind: 'springt'; readonly distance: number; readonly interval: number }
  /** Wird unter einem Lebensanteil deutlich schneller. */
  | { readonly kind: 'rast'; readonly threshold: number; readonly factor: number }
  /** Legt Tuerme in Reichweite fuer eine Weile stumm. */
  | {
      readonly kind: 'stoert';
      readonly radius: number;
      readonly duration: number;
      readonly interval: number;
    }
  /** Detoniert beim ersten Turm in Reichweite und stirbt dabei nicht. */
  | { readonly kind: 'sprengt'; readonly radius: number; readonly duration: number };

/** Ein Abschnitt eines Bosskampfes. Bosse aendern ihr Verhalten, nicht nur ihre Zahlen. */
export interface BossPhase {
  /** Ab welchem Lebensanteil diese Phase gilt. Absteigend angeben. */
  readonly abLebensanteil: number;
  readonly armor: ArmorType;
  readonly speedFactor: number;
  /** Sekunden, die der Boss beim Phasenwechsel unverwundbar bleibt. */
  readonly unverwundbar: number;
  /** Gegner, die beim Phasenwechsel erscheinen. */
  readonly ruft: { readonly enemyId: string; readonly count: number } | null;
  /** Legt beim Phasenwechsel Tuerme im Umkreis still. */
  readonly stoert: { readonly radius: number; readonly duration: number } | null;
}

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
  /** Schadensarten, gegen die der Gegner vollstaendig immun ist. */
  readonly immun: readonly DamageType[];
  /** Schild zu Beginn, wird vor den Lebenspunkten abgetragen. */
  readonly schild: number;
  readonly behaviour: EnemyBehaviour;
  /** Wie viele Leben ein Durchbruch kostet. Bosse kosten mehr. */
  readonly leakCost: number;
  readonly boss: { readonly phasen: readonly BossPhase[] } | null;
  /** Name des Sprite-Blattes. Leer bedeutet: aus der Id abgeleitet. */
  readonly sheet: string;
}

export interface TowerUpgradeDef {
  /** Kosten als Anteil des Grundpreises. */
  readonly costFactor: number;
  /** Zuwachs auf den Grundschaden, 0.55 bedeutet plus 55 Prozent. */
  readonly damageBonus: number;
  readonly rangeBonus: number;
}

/** Wirkung einer Unterstuetzung im Umkreis. */
export interface AuraEffect {
  readonly damageBonus: number;
  readonly rangeBonus: number;
  readonly fireRateBonus: number;
  /** Senkt die Panzerung getroffener Gegner. */
  readonly armorShred: number;
  /** Erhoeht den Schaden, den Gegner erleiden. */
  readonly damageAmp: number;
  /** Deckt unsichtbare Gegner auf. */
  readonly reveal: boolean;
  /** Wirkt auf Gegner statt auf Tuerme. */
  readonly aufGegner: boolean;
}

export type TowerSpecial =
  | { readonly kind: 'keines' }
  /** Springt auf weitere Ziele, jeder Sprung schwaecher. */
  | { readonly kind: 'kette'; readonly jumps: number; readonly falloff: number }
  /** Schiebt getroffene Gegner auf dem Weg zurueck. */
  | { readonly kind: 'rueckstoss'; readonly distance: number }
  /** Steht auf dem Weg statt auf einem Bauplatz. */
  | { readonly kind: 'falle' }
  | { readonly kind: 'aura'; readonly effect: AuraEffect };

export interface TowerDef {
  readonly id: string;
  readonly name: string;
  /** Kurzer Satz fuer die Oberflaeche. */
  readonly beschreibung: string;
  readonly cost: number;
  readonly damage: number;
  /** Schuesse pro Sekunde. Null bedeutet: wirkt dauerhaft, feuert nie. */
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
  /** Modellname des Geschosses im Sprite-Blatt welt. */
  readonly projectileModel: string;
  readonly onHit: EffectSpec;
  readonly defaultPolicy: TargetPolicy;
  readonly special: TowerSpecial;
  readonly upgrades: readonly TowerUpgradeDef[];
  /** Ab welcher Forschungsstufe verfuegbar. Null bedeutet von Beginn an. */
  readonly forschung: string | null;
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

export interface BuildSlotDef {
  readonly x: number;
  readonly y: number;
  /** Bauplatz auf dem Weg. Nur Fallen duerfen hierhin. */
  readonly aufWeg: boolean;
}

export interface PropDef {
  readonly x: number;
  readonly y: number;
  readonly model: string;
  readonly dir: number;
}

/** Eine Kachelart der Karte. Bestimmt nur das Aussehen. */
export type TileKind = 'boden' | 'weg' | 'fluessig' | 'fels' | 'leer';

export interface LevelDef {
  readonly id: string;
  readonly name: string;
  readonly region: Region;
  readonly breite: number;
  readonly hoehe: number;
  readonly paths: readonly (readonly Vec2[])[];
  readonly buildSlots: readonly BuildSlotDef[];
  readonly props: readonly PropDef[];
  /** Zusaetzliche Flaechen, etwa Wasser oder Lava. */
  readonly fluessig: readonly { readonly x: number; readonly y: number }[];
  readonly startGold: number;
  readonly lives: number;
  /** Sekunden zwischen zwei Wellen, wenn nicht vorzeitig gestartet wird. */
  readonly waveInterval: number;
  readonly waves: readonly WaveDef[];
  /** Mutator auf Albtraum. Leer bedeutet keiner. */
  readonly albtraumMutator: string;
}

export interface MutatorDef {
  readonly id: string;
  readonly name: string;
  readonly beschreibung: string;
  readonly healthFactor: number;
  readonly speedFactor: number;
  readonly goldFactor: number;
  /** Zusaetzlicher Schild auf jedem Gegner, als Anteil des Lebens. */
  readonly schildAnteil: number;
  readonly ausbauKosten: number;
  readonly turmReichweite: number;
  /** Keine Bauphase vor der ersten Welle. */
  readonly keineVorbereitung: boolean;
}

export interface Content {
  readonly towers: ReadonlyMap<string, TowerDef>;
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  readonly levels: ReadonlyMap<string, LevelDef>;
  readonly mutators: ReadonlyMap<string, MutatorDef>;
  readonly levelReihenfolge: readonly string[];
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

/** Dauerhafte Verbesserungen aus Forschung und Meisterschaft. */
export interface Boni {
  /** Schaden je Turmtyp, als Faktor. */
  readonly turmSchaden: ReadonlyMap<string, number>;
  readonly turmReichweite: ReadonlyMap<string, number>;
  readonly turmFeuerrate: ReadonlyMap<string, number>;
  readonly globalerSchaden: number;
  readonly globaleReichweite: number;
  readonly ausbauKosten: number;
  readonly startGold: number;
  readonly zusatzLeben: number;
  readonly verkaufswert: number;
  readonly wellenBonus: number;
}

export const KEINE_BONI: Boni = {
  turmSchaden: new Map(),
  turmReichweite: new Map(),
  turmFeuerrate: new Map(),
  globalerSchaden: 1,
  globaleReichweite: 1,
  ausbauKosten: 1,
  startGold: 0,
  zusatzLeben: 0,
  verkaufswert: 0.7,
  wellenBonus: 1,
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
  /** Blickrichtung in Grad, fuer die Darstellung. */
  heading: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  baseSpeed: number;
  armor: ArmorType;
  gold: number;
  flying: boolean;
  invisible: boolean;
  /** Vom Spaehturm aufgedeckt. Wird jeden Schritt neu bestimmt. */
  revealed: boolean;
  /** Staerkste aktive Verlangsamung, 0 bis 1. */
  slowFactor: number;
  slowTicksLeft: number;
  burnDps: number;
  burnTicksLeft: number;
  /** Turmtyp, der den Brand gelegt hat. Nur fuer die Schadensstatistik. */
  burnSourceDefId: string;
  /** Aus Auren, jeden Schritt neu bestimmt. */
  armorShred: number;
  damageAmp: number;
  /** Ticks, in denen kein Schaden wirkt. Bosse beim Phasenwechsel. */
  invulnerableTicks: number;
  /** Ticks bis zur naechsten Sonderhandlung. */
  behaviourTicks: number;
  /** Bereits ausgeloest, fuer einmalige Verhalten. */
  behaviourFired: boolean;
  /** Aktuelle Bossphase. */
  bossPhase: number;
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
  /** Grundwerte aus Definition, Ausbau und dauerhaften Boni. */
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
  /** Werte nach Auren. Werden jeden Schritt neu bestimmt. */
  damage: number;
  range: number;
  fireRate: number;
  /** Sekunden bis zum naechsten Schuss. */
  cooldown: number;
  /** Ticks, in denen der Turm stumm ist. */
  stunTicks: number;
  policy: TargetPolicy;
  /** Blickrichtung in Grad, fuer die Darstellung. */
  heading: number;
  /** Summe aller Ausgaben, Grundlage fuer den Verkaufswert. */
  invested: number;
  damageDealt: number;
  kills: number;
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
  model: string;
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
  /** Rueckstoss in Kacheln. */
  knockback: number;
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
      readonly towerDefId: string;
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
      readonly abgeprallt: boolean;
    }
  | {
      readonly type: 'kettenblitz';
      readonly vonX: number;
      readonly vonY: number;
      readonly nachX: number;
      readonly nachY: number;
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
  | {
      readonly type: 'turm-gestoert';
      readonly towerId: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'schild-gegeben'; readonly enemyId: number }
  | { readonly type: 'geheilt'; readonly enemyId: number; readonly menge: number }
  | { readonly type: 'gesprungen'; readonly enemyId: number }
  | { readonly type: 'bossphase'; readonly enemyId: number; readonly phase: number }
  | { readonly type: 'befehl-abgelehnt'; readonly grund: string }
  | { readonly type: 'gewonnen' }
  | { readonly type: 'verloren' };

export interface RunStats {
  ticks: number;
  killed: number;
  leaked: number;
  goldEarned: number;
  goldSpent: number;
  /** Schaden je Turmtyp, fuer Balancing und fuer die Meisterschaft. */
  readonly damageByTower: Map<string, number>;
  readonly killsByTower: Map<string, number>;
  readonly killsByEnemy: Map<string, number>;
  readonly leaksByEnemy: Map<string, number>;
}
