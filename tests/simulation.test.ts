import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import type { World } from '@sim/index';
import { applyCommand, createWorld, drainEvents, step, TICKS_PER_SECOND } from '@sim/index';

const content = loadContent();

function neueWelt(): World {
  return createWorld({ content, levelId: 'level-01', difficulty: 'normal', seed: 4242 });
}

/** Verdichtet den Zustand zu einer Zeichenkette, um Laeufe zu vergleichen. */
function abdruck(world: World): string {
  const gegner = world.enemies.items
    .filter((enemy) => enemy.active)
    .map((enemy) => `${enemy.id}:${enemy.health.toFixed(4)}:${enemy.travelled.toFixed(4)}`)
    .join('|');
  return [world.tick, world.gold, world.lives, world.wavesStarted, world.wavesCleared, gegner].join(';');
}

describe('Simulation', () => {
  it('startet in der Bauphase und wartet auf den Spieler', () => {
    const world = neueWelt();
    expect(world.status).toBe('vorbereitung');
    for (let i = 0; i < 600; i++) step(world);
    expect(world.wavesStarted).toBe(0);
    expect(world.enemies.activeCount).toBe(0);
  });

  it('laesst nach dem Startbefehl Gegner erscheinen', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    expect(world.wavesStarted).toBe(1);
    step(world);
    expect(world.enemies.activeCount).toBe(1);
  });

  it('liefert bei gleichem Ablauf denselben Zustand', () => {
    const laufen = (): string => {
      const world = neueWelt();
      applyCommand(world, { type: 'welle-starten' });
      applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
      applyCommand(world, { type: 'bauen', slotIndex: 2, towerDefId: 'schleuder' });
      for (let i = 0; i < 60 * TICKS_PER_SECOND; i++) {
        step(world);
        drainEvents(world);
      }
      return abdruck(world);
    };
    expect(laufen()).toBe(laufen());
  });

  it('zieht beim Bauen Gold ab und erstattet beim Verkauf siebzig Prozent', () => {
    const world = neueWelt();
    const start = world.gold;
    applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
    expect(world.gold).toBe(start - 100);

    const towerId = world.occupiedSlots.get(0);
    expect(towerId).toBeDefined();
    applyCommand(world, { type: 'verkaufen', towerId: towerId ?? 0 });
    expect(world.gold).toBe(start - 100 + 70);
    expect(world.occupiedSlots.has(0)).toBe(false);
  });

  it('erhoeht beim Ausbau Schaden und Reichweite', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
    const towerId = world.occupiedSlots.get(0) ?? 0;
    const tower = world.towers.items.find((entry) => entry.id === towerId);
    if (tower === undefined) throw new Error('Turm fehlt');

    const vorher = { damage: tower.damage, range: tower.range };
    applyCommand(world, { type: 'ausbauen', towerId });
    expect(tower.level).toBe(1);
    expect(tower.damage).toBeCloseTo(vorher.damage * 1.55);
    expect(tower.range).toBeCloseTo(vorher.range * 1.08);
  });

  it('lehnt Bauen ohne Gold und auf belegten Plaetzen ab', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
    drainEvents(world);

    applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);

    world.gold = 0;
    applyCommand(world, { type: 'bauen', slotIndex: 1, towerDefId: 'balliste' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
    expect(world.occupiedSlots.has(1)).toBe(false);
  });

  it('verliert ein Leben je durchgekommenem Gegner', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    // Keine Tuerme: die acht Moderlinge der ersten Welle kommen alle durch.
    for (let i = 0; i < 120 * TICKS_PER_SECOND; i++) {
      step(world);
      drainEvents(world);
      if (world.stats.leaked >= 8) break;
    }
    expect(world.stats.leaked).toBe(8);
    expect(world.lives).toBe(20 - 8);
  });

  it('endet verloren, wenn alle Leben aufgebraucht sind', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    for (let i = 0; i < 900 * TICKS_PER_SECOND; i++) {
      step(world);
      drainEvents(world);
      if (world.status === 'verloren') break;
    }
    expect(world.status).toBe('verloren');
    expect(world.lives).toBe(0);
  });

  it('zahlt die Wellenbelohnung erst nach dem Abraeumen aus', () => {
    const world = neueWelt();
    for (let i = 0; i < 12; i++) {
      applyCommand(world, { type: 'bauen', slotIndex: i, towerDefId: 'armbrustturm' });
    }
    applyCommand(world, { type: 'welle-starten' });
    drainEvents(world);

    let belohnt = false;
    for (let i = 0; i < 90 * TICKS_PER_SECOND; i++) {
      step(world);
      for (const event of drainEvents(world)) {
        if (event.type === 'welle-geschafft' && event.wave === 1) {
          expect(event.reward).toBe(40);
          belohnt = true;
        }
      }
      if (belohnt) break;
    }
    expect(belohnt).toBe(true);
    expect(world.wavesCleared).toBe(1);
  });

  it('gibt beim vorzeitigen Wellenstart einen Bonus', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    drainEvents(world);
    // Erste Welle abraeumen lassen, damit die Uhr fuer Welle zwei laeuft.
    for (let i = 0; i < 12; i++) {
      applyCommand(world, { type: 'bauen', slotIndex: i, towerDefId: 'armbrustturm' });
    }
    for (let i = 0; i < 90 * TICKS_PER_SECOND; i++) {
      step(world);
      drainEvents(world);
      if (world.wavesCleared >= 1) break;
    }

    const goldVorher = world.gold;
    expect(world.waveTimer).toBeGreaterThan(0);
    applyCommand(world, { type: 'welle-starten' });
    const ereignis = drainEvents(world).find((e) => e.type === 'welle-gestartet');
    expect(ereignis).toBeDefined();
    if (ereignis !== undefined && ereignis.type === 'welle-gestartet') {
      expect(ereignis.bonus).toBeGreaterThan(0);
      expect(world.gold).toBe(goldVorher + ereignis.bonus);
    }
  });

  it('haelt die Zielpriorität ein', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'bauen', slotIndex: 0, towerDefId: 'armbrustturm' });
    const towerId = world.occupiedSlots.get(0) ?? 0;
    applyCommand(world, { type: 'ziel-setzen', towerId, policy: 'letzter' });
    const tower = world.towers.items.find((entry) => entry.id === towerId);
    expect(tower?.policy).toBe('letzter');
  });
});
