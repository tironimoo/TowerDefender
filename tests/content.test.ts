import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import { validateContent } from '../src/data/validate';
import type { Content, EnemyDef, LevelDef, TowerDef } from '@sim/index';

describe('Inhalte', () => {
  it('sind fehlerfrei und lassen sich laden', () => {
    const content = loadContent();
    expect(validateContent(content)).toEqual([]);
    expect(content.towers.size).toBeGreaterThan(0);
    expect(content.enemies.size).toBeGreaterThan(0);
    expect(content.levels.size).toBeGreaterThan(0);
  });

  it('verweisen in jeder Welle nur auf bekannte Gegner', () => {
    const content = loadContent();
    for (const level of content.levels.values()) {
      for (const wave of level.waves) {
        for (const group of wave.groups) {
          expect(content.enemies.has(group.enemyId)).toBe(true);
        }
      }
    }
  });

  it('meldet einen Tippfehler in einer Welle als klare Meldung', () => {
    const content = loadContent();
    const level = content.levels.get('level-01');
    if (level === undefined) throw new Error('level-01 fehlt');

    const kaputt: LevelDef = {
      ...level,
      waves: [{ groups: [{ enemyId: 'gibtesnicht', count: 1, spacing: 1, delay: 0, pathIndex: 0 }], reward: 10 }],
    };
    const geprueft: Content = {
      towers: content.towers,
      enemies: content.enemies,
      levels: new Map<string, LevelDef>([['kaputt', kaputt]]),
    };

    const probleme = validateContent(geprueft);
    expect(probleme.length).toBeGreaterThan(0);
    expect(probleme.join(' ')).toContain('gibtesnicht');
  });

  it('meldet einen Turm ohne jede Wirkung', () => {
    const content = loadContent();
    const wirkungslos: TowerDef = {
      id: 'attrappe',
      name: 'Attrappe',
      cost: 50,
      damage: 0,
      fireRate: 1,
      range: 3,
      damageType: 'physisch',
      targetsAir: true,
      armorPierce: 0,
      splashRadius: 0,
      projectileSpeed: 5,
      onHit: { slowFactor: 0, slowDuration: 0, burnDps: 0, burnDuration: 0 },
      defaultPolicy: 'erster',
      upgrades: [{ costFactor: 1, damageBonus: 0.5, rangeBonus: 0 }],
    };
    const geprueft: Content = {
      towers: new Map<string, TowerDef>([['attrappe', wirkungslos]]),
      enemies: content.enemies,
      levels: new Map<string, LevelDef>(),
    };
    expect(validateContent(geprueft).join(' ')).toContain('attrappe');
  });

  it('meldet einen Gegner ohne Leben', () => {
    const tot: EnemyDef = {
      id: 'nichts',
      name: 'Nichts',
      health: 0,
      speed: 1,
      armor: 'leder',
      gold: 1,
      flying: false,
      invisible: false,
    };
    const geprueft: Content = {
      towers: new Map<string, TowerDef>(),
      enemies: new Map<string, EnemyDef>([['nichts', tot]]),
      levels: new Map<string, LevelDef>(),
    };
    expect(validateContent(geprueft).join(' ')).toContain('nichts');
  });
});
