import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import type { World } from '@sim/index';
import { applyCommand, createWorld, drainEvents, step, TICKS_PER_SECOND } from '@sim/index';

const content = loadContent();

function neueWelt(): World {
  return createWorld({ content, levelId: 'level-01', difficulty: 'normal', seed: 4242 });
}

/** Erster Bauplatz neben dem Weg. Fallenplaetze nehmen nur Fallen auf. */
function ersterPlatz(world: World, ab = 0): number {
  for (let i = ab; i < world.level.buildSlots.length; i++) {
    if (world.level.buildSlots[i]?.aufWeg === false) return i;
  }
  throw new Error('Kein Bauplatz neben dem Weg.');
}

function laufe(world: World, sekunden: number, abbruch?: (world: World) => boolean): void {
  for (let i = 0; i < sekunden * TICKS_PER_SECOND; i++) {
    step(world);
    drainEvents(world);
    if (abbruch !== undefined && abbruch(world)) return;
  }
}

/** Verdichtet den Zustand zu einer Zeichenkette, um Laeufe zu vergleichen. */
function abdruck(world: World): string {
  const gegner = world.enemies.items
    .filter((enemy) => enemy.active)
    .map((enemy) => `${enemy.id}:${enemy.health.toFixed(4)}:${enemy.travelled.toFixed(4)}`)
    .join('|');
  return [world.tick, world.gold, world.lives, world.wavesStarted, world.wavesCleared, gegner].join(
    ';',
  );
}

describe('Simulation', () => {
  it('startet in der Bauphase und wartet auf den Spieler', () => {
    const world = neueWelt();
    expect(world.status).toBe('vorbereitung');
    laufe(world, 10);
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
      applyCommand(world, { type: 'bauen', slotIndex: ersterPlatz(world), towerDefId: 'armbrustturm' });
      applyCommand(world, {
        type: 'bauen',
        slotIndex: ersterPlatz(world, ersterPlatz(world) + 1),
        towerDefId: 'schleuder',
      });
      laufe(world, 60);
      return abdruck(world);
    };
    expect(laufen()).toBe(laufen());
  });

  it('zieht beim Bauen Gold ab und erstattet beim Verkauf siebzig Prozent', () => {
    const world = neueWelt();
    const platz = ersterPlatz(world);
    const start = world.gold;
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    expect(world.gold).toBe(start - 100);

    const towerId = world.occupiedSlots.get(platz);
    expect(towerId).toBeDefined();
    applyCommand(world, { type: 'verkaufen', towerId: towerId ?? 0 });
    expect(world.gold).toBe(start - 100 + 70);
    expect(world.occupiedSlots.has(platz)).toBe(false);
  });

  it('erhoeht beim Ausbau Schaden und Reichweite', () => {
    const world = neueWelt();
    const platz = ersterPlatz(world);
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    const towerId = world.occupiedSlots.get(platz) ?? 0;
    const tower = world.towers.items.find((entry) => entry.id === towerId);
    if (tower === undefined) throw new Error('Turm fehlt');

    const vorher = { damage: tower.baseDamage, range: tower.baseRange };
    applyCommand(world, { type: 'ausbauen', towerId });
    expect(tower.level).toBe(1);
    expect(tower.baseDamage).toBeCloseTo(vorher.damage * 1.55);
    expect(tower.baseRange).toBeCloseTo(vorher.range * 1.08);
  });

  it('lehnt Bauen ohne Gold und auf belegten Plaetzen ab', () => {
    const world = neueWelt();
    const platz = ersterPlatz(world);
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    drainEvents(world);

    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);

    const zweiter = ersterPlatz(world, platz + 1);
    world.gold = 0;
    applyCommand(world, { type: 'bauen', slotIndex: zweiter, towerDefId: 'balliste' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
    expect(world.occupiedSlots.has(zweiter)).toBe(false);
  });

  it('laesst Fallen nur auf den Weg und alles andere nur daneben', () => {
    const world = neueWelt();
    const wegPlatz = world.level.buildSlots.findIndex((slot) => slot.aufWeg);
    expect(wegPlatz).toBeGreaterThanOrEqual(0);

    applyCommand(world, { type: 'bauen', slotIndex: wegPlatz, towerDefId: 'armbrustturm' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);

    applyCommand(world, { type: 'bauen', slotIndex: wegPlatz, towerDefId: 'ambossfalle' });
    expect(world.occupiedSlots.has(wegPlatz)).toBe(true);

    const neben = ersterPlatz(world);
    applyCommand(world, { type: 'bauen', slotIndex: neben, towerDefId: 'ambossfalle' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
  });

  it('haelt sich an das Loadout', () => {
    const world = createWorld({
      content,
      levelId: 'level-01',
      difficulty: 'normal',
      seed: 1,
      loadout: ['armbrustturm'],
    });
    const platz = ersterPlatz(world);
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'schleuder' });
    expect(drainEvents(world).some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    expect(world.occupiedSlots.has(platz)).toBe(true);
  });

  it('verliert ein Leben je durchgekommenem Gegner', () => {
    const world = neueWelt();
    const ersteWelle = world.level.waves[0];
    const anzahl = ersteWelle?.groups.reduce((summe, g) => summe + g.count, 0) ?? 0;
    expect(anzahl).toBeGreaterThan(0);

    applyCommand(world, { type: 'welle-starten' });
    laufe(world, 200, (w) => w.stats.leaked >= anzahl);
    expect(world.stats.leaked).toBe(anzahl);
    expect(world.lives).toBe(20 - anzahl);
  });

  it('endet verloren, wenn alle Leben aufgebraucht sind', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    laufe(world, 900, (w) => w.status === 'verloren');
    expect(world.status).toBe('verloren');
    expect(world.lives).toBe(0);
  });

  it('zahlt die Wellenbelohnung erst nach dem Abraeumen aus', () => {
    const world = neueWelt();
    for (const slot of world.level.buildSlots.keys()) {
      if (world.level.buildSlots[slot]?.aufWeg === false) {
        applyCommand(world, { type: 'bauen', slotIndex: slot, towerDefId: 'armbrustturm' });
      }
    }
    applyCommand(world, { type: 'welle-starten' });
    drainEvents(world);

    let belohnt = false;
    for (let i = 0; i < 120 * TICKS_PER_SECOND && !belohnt; i++) {
      step(world);
      for (const event of drainEvents(world)) {
        if (event.type === 'welle-geschafft' && event.wave === 1) belohnt = true;
      }
    }
    expect(belohnt).toBe(true);
    expect(world.wavesCleared).toBe(1);
  });

  it('gibt beim vorzeitigen Wellenstart einen Bonus', () => {
    const world = neueWelt();
    applyCommand(world, { type: 'welle-starten' });
    drainEvents(world);
    for (const slot of world.level.buildSlots.keys()) {
      if (world.level.buildSlots[slot]?.aufWeg === false) {
        applyCommand(world, { type: 'bauen', slotIndex: slot, towerDefId: 'armbrustturm' });
      }
    }
    laufe(world, 120, (w) => w.wavesCleared >= 1);

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
    const platz = ersterPlatz(world);
    applyCommand(world, { type: 'bauen', slotIndex: platz, towerDefId: 'armbrustturm' });
    const towerId = world.occupiedSlots.get(platz) ?? 0;
    applyCommand(world, { type: 'ziel-setzen', towerId, policy: 'letzter' });
    const tower = world.towers.items.find((entry) => entry.id === towerId);
    expect(tower?.policy).toBe('letzter');
  });
});
