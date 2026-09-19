/**
 * Tests der Spezialfaehigkeiten.
 *
 * Faehigkeiten sind die letzte Ausbaustufe eines Turms und damit das, worauf
 * ein langes Spiel hinauslaeuft. Wenn hier etwas still kaputtgeht, merkt man es
 * erst nach zwanzig Wellen.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import type { Tower, World } from '@sim/index';
import {
  applyCommand,
  createWorld,
  drainEvents,
  faehigkeitKosten,
  faehigkeitRang,
} from '@sim/index';

const content = loadContent();

function welt(): World {
  const world = createWorld({ content, levelId: 'level-01', difficulty: 'normal', seed: 7 });
  world.gold = 1000000;
  return world;
}

function platzNeben(world: World, ab = 0): number {
  for (let i = ab; i < world.level.buildSlots.length; i++) {
    if (world.level.buildSlots[i]?.aufWeg === false) return i;
  }
  throw new Error('Kein Bauplatz neben dem Weg.');
}

/** Baut einen Turm und baut ihn wahlweise gleich voll aus. */
function turm(world: World, defId = 'armbrustturm', voll = true): Tower {
  applyCommand(world, { type: 'bauen', slotIndex: platzNeben(world), towerDefId: defId });
  const tower = world.towers.items.find((t) => t.active);
  if (tower === undefined) throw new Error('Turm wurde nicht gebaut.');
  if (voll) {
    const def = content.towers.get(defId);
    if (def === undefined) throw new Error('Turmart fehlt.');
    for (let i = 0; i < def.upgrades.length; i++) {
      applyCommand(world, { type: 'ausbauen', towerId: tower.id });
    }
  }
  drainEvents(world);
  return tower;
}

describe('Spezialfaehigkeiten', () => {
  it('jede Turmart hat genau zwei Faehigkeiten mit je zwei Raengen', () => {
    for (const def of content.towers.values()) {
      expect(def.faehigkeiten.length, def.id).toBe(2);
      for (const faehigkeit of def.faehigkeiten) {
        expect(faehigkeit.raenge.length, `${def.id}/${faehigkeit.id}`).toBe(2);
        expect(faehigkeit.kosten.length, `${def.id}/${faehigkeit.id}`).toBe(2);
      }
    }
  });

  it('gibt es erst nach dem letzten Ausbau', () => {
    const world = welt();
    const tower = turm(world, 'armbrustturm', false);
    const def = content.towers.get('armbrustturm');
    if (def === undefined) throw new Error('Turmart fehlt.');

    expect(faehigkeitKosten(world, def, tower, 0)).toBeNull();
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    expect(faehigkeitRang(tower, 0)).toBe(0);
    const ereignisse = drainEvents(world);
    expect(ereignisse.some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
  });

  it('laesst sich zweimal steigern, danach nicht mehr', () => {
    const world = welt();
    const tower = turm(world);
    const def = content.towers.get('armbrustturm');
    if (def === undefined) throw new Error('Turmart fehlt.');

    expect(faehigkeitKosten(world, def, tower, 0)).toBeGreaterThan(0);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    expect(faehigkeitRang(tower, 0)).toBe(1);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    expect(faehigkeitRang(tower, 0)).toBe(2);

    expect(faehigkeitKosten(world, def, tower, 0)).toBeNull();
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    expect(faehigkeitRang(tower, 0)).toBe(2);
  });

  it('der zweite Rang kostet mehr als der erste', () => {
    const world = welt();
    const tower = turm(world);
    const def = content.towers.get('armbrustturm');
    if (def === undefined) throw new Error('Turmart fehlt.');

    const erster = faehigkeitKosten(world, def, tower, 0);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    const zweiter = faehigkeitKosten(world, def, tower, 0);
    expect(erster).not.toBeNull();
    expect(zweiter).not.toBeNull();
    expect(zweiter ?? 0).toBeGreaterThan(erster ?? 0);
  });

  it('beide Faehigkeiten sind unabhaengig voneinander', () => {
    const world = welt();
    const tower = turm(world);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 1 });
    expect(faehigkeitRang(tower, 0)).toBe(0);
    expect(faehigkeitRang(tower, 1)).toBe(1);
  });

  it('wirkt sich auf die Kennwerte aus', () => {
    const world = welt();
    const tower = turm(world);
    const vorher = { schaden: tower.damage, rate: tower.fireRate, reichweite: tower.range };

    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 1 });

    const besser =
      tower.damage > vorher.schaden ||
      tower.fireRate > vorher.rate ||
      tower.range > vorher.reichweite ||
      tower.armorPierce > 0;
    expect(besser).toBe(true);
  });

  it('kostet Gold und erhoeht den Verkaufswert', () => {
    const world = welt();
    const tower = turm(world);
    const def = content.towers.get('armbrustturm');
    if (def === undefined) throw new Error('Turmart fehlt.');

    const kosten = faehigkeitKosten(world, def, tower, 0) ?? 0;
    const goldVorher = world.gold;
    const investiertVorher = tower.invested;
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });

    expect(world.gold).toBe(goldVorher - kosten);
    expect(tower.invested).toBe(investiertVorher + kosten);
  });

  it('ohne Gold passiert nichts', () => {
    const world = welt();
    const tower = turm(world);
    world.gold = 0;
    drainEvents(world);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    expect(faehigkeitRang(tower, 0)).toBe(0);
    const ereignisse = drainEvents(world);
    expect(ereignisse.some((e) => e.type === 'befehl-abgelehnt')).toBe(true);
  });

  it('meldet den gelernten Rang', () => {
    const world = welt();
    const tower = turm(world);
    applyCommand(world, { type: 'faehigkeit', towerId: tower.id, index: 0 });
    const ereignis = drainEvents(world).find((e) => e.type === 'faehigkeit-gelernt');
    expect(ereignis).toBeDefined();
    if (ereignis?.type === 'faehigkeit-gelernt') {
      expect(ereignis.rang).toBe(1);
      expect(ereignis.name.length).toBeGreaterThan(0);
    }
  });
});
