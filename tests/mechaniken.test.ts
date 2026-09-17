/**
 * Tests der Sonderverhalten.
 *
 * Jede Eigenschaft, die einen Gegner oder Turm besonders macht, braucht einen
 * Test. Sonst faellt es erst im Spiel auf, wenn eine davon still aufhoert zu
 * wirken.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import type { Enemy, World } from '@sim/index';
import {
  applyCommand,
  createWorld,
  drainEvents,
  erzeugeGegner,
  positionOnRoute,
  step,
  TICKS_PER_SECOND,
} from '@sim/index';

const content = loadContent();

function welt(levelId = 'level-01'): World {
  const world = createWorld({ content, levelId, difficulty: 'normal', seed: 7 });
  world.gold = 100000;
  return world;
}

function platzNeben(world: World, ab = 0): number {
  for (let i = ab; i < world.level.buildSlots.length; i++) {
    if (world.level.buildSlots[i]?.aufWeg === false) return i;
  }
  throw new Error('Kein Bauplatz neben dem Weg.');
}

/**
 * Setzt einen stehenden Gegner auf eine Stelle des Weges.
 *
 * Die Position darf nicht von Hand gesetzt werden: die Bewegung rechnet sie in
 * jedem Schritt aus der zurueckgelegten Strecke neu aus und wuerde sie wieder
 * ueberschreiben.
 */
function gegnerAuf(world: World, defId: string, travelled: number): Enemy {
  const enemy = erzeugeGegner(world, {
    defId,
    waveNumber: 1,
    routeIndex: 0,
    travelled,
    healthFactor: 1,
    goldFactor: 1,
    speedFactor: 1,
  });
  if (enemy === null) throw new Error('Gegner fehlt');
  enemy.baseSpeed = 0;
  return enemy;
}

const gegnerBei = (world: World, defId: string, _x: number, _y: number): Enemy =>
  gegnerAuf(world, defId, 0);

/** Stellt einen Turm genau dorthin, wo ein Gegner steht. */
function turmZuGegner(world: World, towerId: number, enemy: Enemy): void {
  const turm = world.towers.items.find((t) => t.id === towerId);
  if (turm === undefined) throw new Error('Turm fehlt');
  const route = world.routes[0];
  if (route === undefined) throw new Error('Weg fehlt');
  const punkt = { x: 0, y: 0 };
  positionOnRoute(route, enemy.travelled, enemy.flying, punkt);
  turm.x = punkt.x;
  turm.y = punkt.y;
}

function bauen(world: World, defId: string, slot: number): number {
  applyCommand(world, { type: 'bauen', slotIndex: slot, towerDefId: defId });
  const id = world.occupiedSlots.get(slot);
  if (id === undefined) throw new Error(`Turm ${defId} liess sich nicht bauen`);
  return id;
}

function schritte(world: World, anzahl: number): void {
  for (let i = 0; i < anzahl; i++) {
    step(world);
    drainEvents(world);
  }
}

describe('Tuerme', () => {
  it('verstaerkt das Leuchtfeuer benachbarte Tuerme', () => {
    const world = welt();
    const a = platzNeben(world);
    const b = platzNeben(world, a + 1);
    const armbrustId = bauen(world, 'armbrustturm', a);
    const armbrust = world.towers.items.find((t) => t.id === armbrustId);
    if (armbrust === undefined) throw new Error('Turm fehlt');

    step(world);
    const ohne = armbrust.damage;
    expect(ohne).toBeCloseTo(armbrust.baseDamage);

    // Leuchtfeuer daneben setzen und die Reichweite grosszuegig machen.
    const feuerId = bauen(world, 'leuchtfeuer', b);
    const feuer = world.towers.items.find((t) => t.id === feuerId);
    if (feuer === undefined) throw new Error('Leuchtfeuer fehlt');
    feuer.baseRange = 99;
    step(world);

    expect(armbrust.damage).toBeGreaterThan(ohne);
    expect(armbrust.damage).toBeCloseTo(armbrust.baseDamage * 1.2);
  });

  it('senkt der Alchemieturm die Panzerung der Gegner', () => {
    const world = welt();
    const slot = platzNeben(world);
    const id = bauen(world, 'alchemieturm', slot);
    const turm = world.towers.items.find((t) => t.id === id);
    if (turm === undefined) throw new Error('Turm fehlt');
    turm.baseRange = 99;

    const enemy = gegnerBei(world, 'knochenschuetze', turm.x, turm.y);
    step(world);
    expect(enemy.armorShred).toBeCloseTo(0.4);
    expect(enemy.damageAmp).toBeCloseTo(0.15);
  });

  it('deckt der Spaehturm Unsichtbare auf', () => {
    const world = welt('level-08');
    const slot = platzNeben(world);
    const id = bauen(world, 'spaehturm', slot);
    const turm = world.towers.items.find((t) => t.id === id);
    if (turm === undefined) throw new Error('Turm fehlt');
    turm.baseRange = 99;

    const enemy = gegnerBei(world, 'leerenbrut', turm.x, turm.y);
    expect(enemy.invisible).toBe(true);
    step(world);
    expect(enemy.revealed).toBe(true);
  });

  it('springt die Blitzspule auf weitere Ziele', () => {
    const world = welt();
    const slot = platzNeben(world);
    const id = bauen(world, 'blitzspule', slot);

    const a = gegnerAuf(world, 'moderling', 8);
    const b = gegnerAuf(world, 'moderling', 8.6);
    const c = gegnerAuf(world, 'moderling', 9.2);
    turmZuGegner(world, id, a);

    schritte(world, 3);
    expect(a.health).toBeLessThan(a.maxHealth);
    expect(b.health).toBeLessThan(b.maxHealth);
    expect(c.health).toBeLessThan(c.maxHealth);
    // Die Zielpriorität waehlt den vordersten Gegner, von dort springt der
    // Blitz nach hinten und wird mit jedem Sprung schwaecher.
    expect(c.maxHealth - c.health).toBeGreaterThan(b.maxHealth - b.health);
    expect(b.maxHealth - b.health).toBeGreaterThan(a.maxHealth - a.health);
  });

  it('schiebt der Kolbenstoss Gegner auf dem Weg zurueck', () => {
    const world = welt();
    const slot = platzNeben(world);
    const id = bauen(world, 'kolbenstoss', slot);
    const enemy = gegnerAuf(world, 'moderling', 10);
    turmZuGegner(world, id, enemy);

    schritte(world, 3);
    expect(enemy.travelled).toBeLessThan(10);
  });

  it('kann ein gestoerter Turm nicht feuern', () => {
    const world = welt();
    const slot = platzNeben(world);
    const id = bauen(world, 'armbrustturm', slot);
    const enemy = gegnerAuf(world, 'moderling', 10);
    turmZuGegner(world, id, enemy);
    const turm = world.towers.items.find((t) => t.id === id);
    if (turm === undefined) throw new Error('Turm fehlt');
    turm.stunTicks = 5 * TICKS_PER_SECOND;
    schritte(world, 60);
    expect(enemy.health).toBe(enemy.maxHealth);

    turm.stunTicks = 0;
    schritte(world, 60);
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });
});

describe('Gegner', () => {
  it('zerfaellt der Magmakoloss beim Tod in Splitter', () => {
    const world = welt('level-05');
    const enemy = gegnerBei(world, 'magmakoloss', 5, 5);
    enemy.health = 1;
    world.damageQueue.push({
      enemyPoolIndex: enemy.poolIndex,
      amount: 999,
      damageType: 'physisch',
      armorPierce: 1,
      towerId: 0,
      towerDefId: 'test',
      effect: { slowFactor: 0, slowDuration: 0, burnDps: 0, burnDuration: 0 },
      knockback: 0,
    });
    step(world);

    const splitter = world.enemies.items.filter((e) => e.active && e.defId === 'kolosssplitter');
    expect(splitter).toHaveLength(2);
  });

  it('gibt der Schildwart Nachbarn einen Schild', () => {
    const world = welt('level-05');
    const wart = gegnerBei(world, 'schildwart', 5, 5);
    const nachbar = gegnerBei(world, 'glutgeist', 5.5, 5);
    wart.behaviourTicks = 0;
    expect(nachbar.shield).toBe(0);
    schritte(world, 2);
    expect(nachbar.shield).toBeGreaterThan(0);
  });

  it('heilt das Echo den am staerksten verletzten Gegner', () => {
    const world = welt('level-08');
    const echo = gegnerBei(world, 'echo', 5, 5);
    const verletzt = gegnerBei(world, 'schreiter', 5.5, 5);
    verletzt.health = verletzt.maxHealth * 0.3;
    const vorher = verletzt.health;
    echo.behaviourTicks = 0;
    schritte(world, 2);
    expect(verletzt.health).toBeGreaterThan(vorher);
  });

  it('ueberspringt der Schreiter ein Wegstueck', () => {
    const world = welt('level-08');
    const enemy = gegnerBei(world, 'schreiter', 5, 5);
    enemy.behaviourTicks = 0;
    enemy.travelled = 5;
    schritte(world, 2);
    expect(enemy.travelled).toBeGreaterThanOrEqual(8.5);
  });

  it('wird der Rissgaenger unter halbem Leben schneller', () => {
    const world = welt('level-08');
    const enemy = gegnerBei(world, 'rissgaenger', 5, 5);
    enemy.baseSpeed = 1;
    enemy.health = enemy.maxHealth * 0.4;
    schritte(world, 2);
    expect(enemy.baseSpeed).toBeCloseTo(2);
  });

  it('prallt Feuer am Glutgeist vollstaendig ab', () => {
    const world = welt('level-05');
    const enemy = gegnerBei(world, 'glutgeist', 5, 5);
    world.damageQueue.push({
      enemyPoolIndex: enemy.poolIndex,
      amount: 500,
      damageType: 'feuer',
      armorPierce: 1,
      towerId: 0,
      towerDefId: 'test',
      effect: { slowFactor: 0, slowDuration: 0, burnDps: 0, burnDuration: 0 },
      knockback: 0,
    });
    step(world);
    expect(enemy.health).toBe(enemy.maxHealth);
  });

  it('traegt der Schild den Schaden vor den Lebenspunkten', () => {
    const world = welt('level-05');
    const enemy = gegnerBei(world, 'moderling', 5, 5);
    enemy.maxShield = 50;
    enemy.shield = 50;
    world.damageQueue.push({
      enemyPoolIndex: enemy.poolIndex,
      amount: 30,
      damageType: 'physisch',
      armorPierce: 0,
      towerId: 0,
      towerDefId: 'test',
      effect: { slowFactor: 0, slowDuration: 0, burnDps: 0, burnDuration: 0 },
      knockback: 0,
    });
    step(world);
    expect(enemy.shield).toBeCloseTo(20);
    expect(enemy.health).toBe(enemy.maxHealth);
  });

  it('wechselt ein Boss die Phase und wird dabei kurz unverwundbar', () => {
    const world = welt('level-04');
    const boss = gegnerBei(world, 'waldwaechter', 5, 5);
    expect(boss.bossPhase).toBe(0);
    boss.health = boss.maxHealth * 0.5;
    step(world);
    expect(boss.bossPhase).toBe(1);
    expect(boss.invulnerableTicks).toBeGreaterThan(0);
    const gerufene = world.enemies.items.filter((e) => e.active && e.defId === 'krabbler');
    expect(gerufene.length).toBeGreaterThan(0);
  });
});

describe('Mutatoren', () => {
  it('geben Gegnern auf Albtraum einen Schild', () => {
    const world = createWorld({
      content,
      levelId: 'level-01',
      difficulty: 'normal',
      seed: 1,
      mutatorId: 'gepanzert',
    });
    const enemy = gegnerBei(world, 'moderling', 5, 5);
    expect(enemy.shield).toBeGreaterThan(0);
  });

  it('verteuern Ausbauten', () => {
    const world = createWorld({
      content,
      levelId: 'level-01',
      difficulty: 'normal',
      seed: 1,
      mutatorId: 'teuer',
    });
    world.gold = 10000;
    const slot = platzNeben(world);
    const id = bauen(world, 'armbrustturm', slot);
    const vorher = world.gold;
    applyCommand(world, { type: 'ausbauen', towerId: id });
    // Grundstufe kostet 60 Prozent von 100, verdoppelt also 120.
    expect(vorher - world.gold).toBe(120);
  });
});
