/**
 * Erzeugen einer Partie und Entgegennehmen von Befehlen.
 *
 * Die Simulation kennt keine Eingabegeraete. Sie nimmt Befehle entgegen und
 * gibt Zustand und Ereignisse zurueck. Siehe docs/03-architektur.md.
 */

import { Pool } from '@shared/pool';
import type {
  Content,
  Difficulty,
  Enemy,
  Projectile,
  SimCommand,
  SpawnOrder,
  Tower,
  TowerDef,
} from '../model/types';
import { DIFFICULTY, NO_EFFECT } from '../model/types';
import type { World } from '../model/world';
import { createRng } from './rng';
import { buildRoute } from './route';
import { SELL_REFUND } from './balance';
import { startNextWave } from '../systems/waves';

export interface CreateWorldOptions {
  readonly content: Content;
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly seed: number;
}

export function createWorld(options: CreateWorldOptions): World {
  const level = options.content.levels.get(options.levelId);
  if (level === undefined) {
    throw new Error(`Unbekanntes Level: ${options.levelId}`);
  }
  const mods = DIFFICULTY[options.difficulty];

  return {
    tick: 0,
    status: 'vorbereitung',
    rng: createRng(options.seed),
    content: options.content,
    level,
    routes: level.paths.map(buildRoute),
    difficulty: mods,
    gold: level.startGold,
    lives: level.lives,
    wavesStarted: 0,
    wavesCleared: 0,
    waveCount: level.waves.length + mods.extraWaves,
    // Vor der ersten Welle gibt es keine Zeitbegrenzung.
    waveTimer: -1,
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
  tower.policy = def.defaultPolicy;
  tower.invested = def.cost;
  tower.damageDealt = 0;
  applyTowerStats(tower, def);

  world.occupiedSlots.set(slotIndex, tower.id);
  world.events.push({
    type: 'turm-gebaut',
    towerId: tower.id,
    defId: def.id,
    x: tower.x,
    y: tower.y,
  });
}

function commandUpgrade(world: World, towerId: number): void {
  const tower = findTower(world, towerId);
  if (tower === null) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm nicht gefunden.' });
    return;
  }
  const def = world.content.towers.get(tower.defId);
  if (def === undefined) return;

  const nextStep = def.upgrades[tower.level];
  if (nextStep === undefined) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm ist voll ausgebaut.' });
    return;
  }

  const cost = Math.round(def.cost * nextStep.costFactor);
  if (world.gold < cost) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Nicht genug Gold.' });
    return;
  }

  world.gold -= cost;
  world.stats.goldSpent += cost;
  tower.invested += cost;
  tower.level += 1;
  applyTowerStats(tower, def);
  world.events.push({ type: 'turm-ausgebaut', towerId: tower.id, level: tower.level });
}

function commandSell(world: World, towerId: number): void {
  const tower = findTower(world, towerId);
  if (tower === null) {
    world.events.push({ type: 'befehl-abgelehnt', grund: 'Turm nicht gefunden.' });
    return;
  }
  const refund = Math.floor(tower.invested * SELL_REFUND);
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
 * Setzt Schaden und Reichweite aus Grundwert und Ausbaustufe.
 * Die Zuwaechse multiplizieren sich, eine Stufe mit plus 55 Prozent erhoeht den
 * bereits erreichten Wert. Siehe docs/05-startwerte.md.
 */
export function applyTowerStats(tower: Tower, def: TowerDef): void {
  let damage = def.damage;
  let range = def.range;
  for (let step = 0; step < tower.level; step++) {
    const upgrade = def.upgrades[step];
    if (upgrade === undefined) break;
    damage *= 1 + upgrade.damageBonus;
    range *= 1 + upgrade.rangeBonus;
  }
  tower.damage = damage;
  tower.range = range;
  tower.fireRate = def.fireRate;
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
    health: 0,
    maxHealth: 0,
    baseSpeed: 0,
    armor: 'leder',
    gold: 0,
    flying: false,
    invisible: false,
    slowFactor: 0,
    slowTicksLeft: 0,
    burnDps: 0,
    burnTicksLeft: 0,
    burnSourceDefId: '',
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
    damage: 0,
    range: 0,
    fireRate: 0,
    cooldown: 0,
    policy: 'erster',
    invested: 0,
    damageDealt: 0,
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
