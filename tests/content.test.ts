import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import { validateContent } from '../src/data/validate';
import type { Content, EnemyDef, LevelDef, TowerDef } from '@sim/index';

const echt = loadContent();

/** Baut einen Inhaltssatz, in dem nur ein Teil ausgetauscht ist. */
function mit(teil: Partial<Content>): Content {
  return {
    towers: echt.towers,
    enemies: echt.enemies,
    levels: echt.levels,
    mutators: echt.mutators,
    levelReihenfolge: echt.levelReihenfolge,
    ...teil,
  };
}

describe('Inhalte', () => {
  it('sind fehlerfrei und lassen sich laden', () => {
    expect(validateContent(echt)).toEqual([]);
    expect(echt.towers.size).toBe(12);
    expect(echt.enemies.size).toBeGreaterThanOrEqual(15);
    expect(echt.levels.size).toBe(10);
    expect(echt.mutators.size).toBeGreaterThan(0);
  });

  it('haben zehn Level in fester Reihenfolge', () => {
    expect(echt.levelReihenfolge).toHaveLength(10);
    for (const id of echt.levelReihenfolge) {
      expect(echt.levels.has(id)).toBe(true);
    }
  });

  it('verweisen in jeder Welle nur auf bekannte Gegner', () => {
    for (const level of echt.levels.values()) {
      for (const wave of level.waves) {
        for (const group of wave.groups) {
          expect(echt.enemies.has(group.enemyId)).toBe(true);
          expect(group.pathIndex).toBeLessThan(level.paths.length);
        }
      }
    }
  });

  it('geben jeder Karte Bauplaetze neben dem Weg und Plaetze fuer Fallen', () => {
    for (const level of echt.levels.values()) {
      expect(level.buildSlots.some((slot) => !slot.aufWeg)).toBe(true);
      expect(level.buildSlots.some((slot) => slot.aufWeg)).toBe(true);
      expect(level.buildSlots.length).toBeGreaterThanOrEqual(12);
    }
  });

  it('stellen vier Tuerme ohne Forschung bereit', () => {
    const frei = [...echt.towers.values()].filter((turm) => turm.forschung === null);
    expect(frei).toHaveLength(4);
  });

  it('meldet einen Tippfehler in einer Welle als klare Meldung', () => {
    const level = echt.levels.get('level-01');
    if (level === undefined) throw new Error('level-01 fehlt');
    const kaputt: LevelDef = {
      ...level,
      waves: [
        {
          groups: [{ enemyId: 'gibtesnicht', count: 1, spacing: 1, delay: 0, pathIndex: 0 }],
          reward: 10,
        },
      ],
    };
    const probleme = validateContent(mit({ levels: new Map([['kaputt', kaputt]]) }));
    expect(probleme.join(' ')).toContain('gibtesnicht');
  });

  it('meldet einen Turm ohne jede Wirkung', () => {
    const vorlage = echt.towers.get('armbrustturm');
    if (vorlage === undefined) throw new Error('armbrustturm fehlt');
    const wirkungslos: TowerDef = { ...vorlage, id: 'attrappe', damage: 0 };
    const probleme = validateContent(mit({ towers: new Map([['attrappe', wirkungslos]]) }));
    expect(probleme.join(' ')).toContain('attrappe');
  });

  it('meldet einen Gegner ohne Leben', () => {
    const vorlage = echt.enemies.get('moderling');
    if (vorlage === undefined) throw new Error('moderling fehlt');
    const tot: EnemyDef = { ...vorlage, id: 'nichts', health: 0 };
    const probleme = validateContent(
      mit({ enemies: new Map([['nichts', tot]]), levels: new Map() }),
    );
    expect(probleme.join(' ')).toContain('nichts');
  });

  it('meldet einen Gegner, der sich in etwas Unbekanntes teilt', () => {
    const vorlage = echt.enemies.get('magmakoloss');
    if (vorlage === undefined) throw new Error('magmakoloss fehlt');
    const kaputt: EnemyDef = {
      ...vorlage,
      id: 'bruchstueck',
      behaviour: { kind: 'teilt', childId: 'gibtesnicht', count: 2 },
    };
    const probleme = validateContent(
      mit({ enemies: new Map([['bruchstueck', kaputt]]), levels: new Map() }),
    );
    expect(probleme.join(' ')).toContain('gibtesnicht');
  });
});
