/**
 * Erzeugen einer Partie und Entgegennehmen von Befehlen.
 *
 * Die Simulation kennt keine Eingabegeraete. Sie nimmt Befehle entgegen und
 * gibt Zustand und Ereignisse zurueck. Siehe docs/03-architektur.md.
 */

import { Pool } from '@shared/pool';
import type {
  Boni,
  Content,
  Difficulty,
  Enemy,

  Projectile,
  SimCommand,
  SpawnOrder,
  Tower,
  TowerDef,
} from '../model/types';
import { DIFFICULTY, KEIN_TURM_BONUS, KEINE_BONI, NO_EFFECT } from '../model/types';
import type { World } from '../model/world';
import { createRng } from './rng';
import { buildRoute } from './route';
import { startNextWave } from '../systems/waves';

export interface CreateWorldOptions {
  readonly content: Content;
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly seed: number;
  /** Dauerhafte Verbesserungen aus Forschung und Meisterschaft. */
  readonly boni?: Boni;
  /** Mutator-Id. Leer oder fehlend bedeutet keiner. */
  readonly mutatorId?: string;
  /** Erlaubte Tuerme. Leer bedeutet alle. */
  readonly loadout?: readonly string[];
  /**
   * Endlos-Modus.
   * Die Wellen hoeren nicht auf, die letzte wiederholt sich immer staerker.
   * Die Partie endet erst, wenn die Leben aufgebraucht sind.
   */
  readonly endlos?: boolean;
}

export function createWorld(options: CreateWorldOptions): World {
  const level = options.content.levels.get(options.levelId);
  if (level === undefined) throw new Error(`Unbekanntes Level: ${options.levelId}`);

  const mods = DIFFICULTY[options.difficulty];
  const boni = options.boni ?? KEINE_BONI;

  // Auf Albtraum traegt jede Karte ihren eigenen Mutator.
  const mutatorId =
    options.mutatorId !== undefined && options.mutatorId !== ''
      ? options.mutatorId
      : options.difficulty === 'albtraum'
        ? level.albtraumMutator
        : '';
  const mutator = mutatorId === '' ? null : (options.content.mutators.get(mutatorId) ?? null);

  return {
    tick: 0,
    status: 'vorbereitung',
    rng: createRng(options.seed),
    content: options.content,
    level,
    routes: level.paths.map(buildRoute),
    difficulty: mods,
    boni,
    mutator,
    loadout: options.loadout ?? [],
    gold: level.startGold + boni.startGold,
    lives: level.lives + boni.zusatzLeben,
    startLives: level.lives + boni.zusatzLeben,
    wavesStarted: 0,
    wavesCleared: 0,
    waveCount: options.endlos === true ? 9999 : level.waves.length + mods.extraWaves,
    // Vor der ersten Welle gibt es keine Zeitbegrenzung, ausser der Mutator
    // nimmt sie weg.
    waveTimer: mutator?.keineVorbereitung === true ? 5 : -1,
    enemies: new Pool<Enemy>(createEnemy),
    towers: new Pool<Tower>(createTower),
    projectiles: new Pool<Projectile>(createProjectile),
    spawns: new Pool<SpawnOrder>(createSpawnOrder),
    damageQueue: [],
    events: [],
    occupiedSlots: new Map(),
    nextEntityId: 1,
    stats: {
      ticks: 0,
      killed: 0,
      leaked: 0,
      goldEarned: 0,
      goldSpent: 0,
      damageByTower: new Map(),
      killsByTower: new Map(),
      killsByEnemy: new Map(),
      leaksByEnemy: new Map(),
    },
  };
}

// ---------------------------------------------------------------------------
// Befehle
// ---------------------------------------------------------------------------

export function applyCommand(world: World, command: SimCommand): void {
  if (world.status === 'gewonnen' || world.status === 'verloren') {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Die Partie ist beendet.' });
    return;
  }

  switch (command.type) {
    case 'bauen':
      commandBuild(world, command.slotIndex, command.towerDefId);
      return;
    case 'ausbauen':
      commandUpgrade(world, command.towerId);
      return;
    case 'verkaufen':
      commandSell(world, command.towerId);
      return;
    case 'ziel-setzen': {
      const tower = findTower(world, command.towerId);
      if (tower === null) {
        world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm nicht gefunden.' });
        return;
      }
      tower.policy = command.policy;
      return;
    }
    case 'welle-starten':
      commandStartWave(world);
      return;
  }
}

function commandBuild(world: World, slotIndex: number, towerDefId: string): void {
  const slot = world.level.buildSlots[slotIndex];
  if (slot === undefined) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Bauplatz gibt es nicht.' });
    return;
  }
  if (world.occupiedSlots.has(slotIndex)) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Bauplatz ist belegt.' });
    return;
  }
  const def = world.content.towers.get(towerDefId);
  if (def === undefined) {
    world.events.push({ type: 'befehl-abgelehnt', grund: `Unbekannter Turm: ${towerDefId}` });
    return;
  }
  if (world.loadout.length > 0 && !world.loadout.includes(towerDefId)) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm ist nicht im Loadout.' });
    return;
  }

  // Fallen gehoeren auf den Weg, alles andere daneben.
  const istFalle = def.special.kind === 'falle';
  if (istFalle !== slot.aufWeg) {
    world.events.push({
      type: 'befehl-abgelehnt',
      grund: istFalle ? 'Fallen gehoeren auf den Weg.' : 'Dieser Platz nimmt nur Fallen auf.',
    });
    return;
  }

  if (world.gold < def.cost) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Nicht genug Gold.' });
    return;
  }

  world.gold -= def.cost;
  world.stats.goldSpent += def.cost;

  const tower = world.towers.acquire();
  tower.id = world.nextEntityId++;
  tower.defId = def.id;
  tower.slotIndex = slotIndex;
  tower.x = slot.x;
  tower.y = slot.y;
  tower.level = 0;
  tower.cooldown = 0;
  tower.stunTicks = 0;
  tower.policy = def.defaultPolicy;
  tower.heading = 0;
  tower.invested = def.cost;
  tower.damageDealt = 0;
  tower.kills = 0;
  applyTowerStats(world, tower, def);

  world.occupiedSlots.set(slotIndex, tower.id);
  world.events.push({
    type: 'turm-gebaut',
    towerId: tower.id,
    defId: def.id,
    x: tower.x,
    y: tower.y,
  });
}

export function ausbauKosten(world: World, def: TowerDef, level: number): number | null {
  const step = def.upgrades[level];
  if (step === undefined) return null;
  const faktor = world.boni.ausbauKosten * (world.mutator?.ausbauKosten ?? 1);
  return Math.round(def.cost * step.costFactor * faktor);
}

function commandUpgrade(world: World, towerId: number): void {
  const tower = findTower(world, towerId);
  if (tower === null) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm nicht gefunden.' });
    return;
  }
  const def = world.content.towers.get(tower.defId);
  if (def === undefined) return;

  const cost = ausbauKosten(world, def, tower.level);
  if (cost === null) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm ist voll ausgebaut.' });
    return;
  }
  if (world.gold < cost) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Nicht genug Gold.' });
    return;
  }

  world.gold -= cost;
  world.stats.goldSpent += cost;
  tower.invested += cost;
  tower.level += 1;
  applyTowerStats(world, tower, def);
  world.events.push({ type: 'turm-ausgebaut', towerId: tower.id, level: tower.level });
}

function commandSell(world: World, towerId: number): void {
  const tower = findTower(world, towerId);
  if (tower === null) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm nicht gefunden.' });
    return;
  }
  const refund = Math.floor(tower.invested * world.boni.verkaufswert);
  world.gold += refund;
  world.occupiedSlots.delete(tower.slotIndex);
  world.towers.release(tower);
  world.events.push({ type: 'turm-verkauft', towerId: tower.id, refund });
}

function commandStartWave(world: World): void {
  if (world.wavesStarted >= world.waveCount) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Es gibt keine weitere Welle.' });
    return;
  }
  // Vor der ersten Welle laeuft keine Uhr, es gibt also auch keinen Bonus.
  const bonusSeconds = world.waveTimer > 0 ? world.waveTimer : 0;
  startNextWave(world, bonusSeconds);
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Setzt Grundschaden, Grundreichweite und Feuerrate.
 *
 * Die Zuwaechse der Ausbaustufen multiplizieren sich, eine Stufe mit plus 55
 * Prozent erhoeht den bereits erreichten Wert. Darauf kommen die dauerhaften
 * Boni aus Forschung und Meisterschaft sowie der Mutator. Auren wirken erst
 * spaeter, jeden Schritt neu, siehe systems/auren.ts.
 */
export function applyTowerStats(world: World, tower: Tower, def: TowerDef): void {
  const turmBonus = world.boni.tuerme.get(def.id) ?? KEIN_TURM_BONUS;
  let damage = def.damage + turmBonus.schadenPlus;
  let range = def.range;
  for (let step = 0; step < tower.level; step++) {
    const upgrade = def.upgrades[step];
    if (upgrade === undefined) break;
    damage *= 1 + upgrade.damageBonus;
    range *= 1 + upgrade.rangeBonus;
  }

  const boni = world.boni;
  const turm = turmBonus;

  damage *= turm.schaden * boni.globalerSchaden;
  range *= turm.reichweite * boni.globaleReichweite * (world.mutator?.turmReichweite ?? 1);

  tower.baseDamage = damage;
  tower.baseRange = range;
  tower.baseFireRate = def.fireRate * turm.feuerrate;
  tower.damage = damage;
  tower.range = range;
  tower.fireRate = tower.baseFireRate;

  tower.splashRadius = def.splashRadius > 0 ? def.splashRadius + turm.splash : turm.splash;
  tower.armorPierce = Math.min(1, def.armorPierce + turm.durchschlag);
  tower.kettenSpruenge =
    def.special.kind === 'kette' ? def.special.jumps + turm.kettenSpruenge : 0;
  tower.auraStaerke = turm.auraStaerke;
  tower.onHit = {
    slowFactor: Math.min(1, def.onHit.slowFactor + (def.onHit.slowFactor > 0 ? turm.verlangsamung : 0)),
    slowDuration: def.onHit.slowDuration,
    burnDps: def.onHit.burnDps > 0 ? def.onHit.burnDps + turm.brandDps : 0,
    burnDuration: def.onHit.burnDuration,
  };
}

export function findTower(world: World, towerId: number): Tower | null {
  const items = world.towers.items;
  for (let i = 0; i < items.length; i++) {
    const tower = items[i];
    if (tower !== undefined && tower.active && tower.id === towerId) return tower;
  }
  return null;
}

export function findEnemy(world: World, enemyId: number): Enemy | null {
  const items = world.enemies.items;
  for (let i = 0; i < items.length; i++) {
    const enemy = items[i];
    if (enemy !== undefined && enemy.active && enemy.id === enemyId) return enemy;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Erzeuger fuer die Vorraete
// ---------------------------------------------------------------------------

function createEnemy(): Enemy {
  return {
    active: false,
    poolIndex: 0,
    id: 0,
    defId: '',
    waveNumber: 0,
    routeIndex: 0,
    travelled: 0,
    routeLength: 0,
    x: 0,
    y: 0,
    heading: 0,
    health: 0,
    maxHealth: 0,
    shield: 0,
    maxShield: 0,
    baseSpeed: 0,
    armor: 'leder',
    gold: 0,
    flying: false,
    invisible: false,
    revealed: false,
    slowFactor: 0,
    slowTicksLeft: 0,
    burnDps: 0,
    burnTicksLeft: 0,
    burnSourceDefId: '',
    armorShred: 0,
    damageAmp: 0,
    invulnerableTicks: 0,
    behaviourTicks: 0,
    behaviourFired: false,
    bossPhase: 0,
    reachedGoal: false,
  };
}

function createTower(): Tower {
  return {
    active: false,
    poolIndex: 0,
    id: 0,
    defId: '',
    slotIndex: -1,
    x: 0,
    y: 0,
    level: 0,
    baseDamage: 0,
    baseRange: 0,
    baseFireRate: 0,
    damage: 0,
    range: 0,
    fireRate: 0,
    splashRadius: 0,
    armorPierce: 0,
    kettenSpruenge: 0,
    auraStaerke: 1,
    onHit: NO_EFFECT,
    cooldown: 0,
    stunTicks: 0,
    policy: 'erster',
    heading: 0,
    invested: 0,
    damageDealt: 0,
    kills: 0,
  };
}

function createProjectile(): Projectile {
  return {
    active: false,
    poolIndex: 0,
    id: 0,
    x: 0,
    y: 0,
    targetId: 0,
    targetX: 0,
    targetY: 0,
    speed: 0,
    damage: 0,
    damageType: 'physisch',
    armorPierce: 0,
    splashRadius: 0,
    targetsAir: false,
    towerId: 0,
    towerDefId: '',
    model: '',
    effect: NO_EFFECT,
  };
}

function createSpawnOrder(): SpawnOrder {
  return {
    active: false,
    poolIndex: 0,
    enemyId: '',
    remaining: 0,
    nextTick: 0,
    spacingTicks: 0,
    routeIndex: 0,
    waveNumber: 0,
    healthFactor: 1,
    goldFactor: 1,
    speedFactor: 1,
  };
}
