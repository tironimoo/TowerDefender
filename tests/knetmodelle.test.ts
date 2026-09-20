/**
 * Prueft, dass die Welt vollstaendig ist.
 *
 * Ein fehlendes Modell faellt im Spiel erst auf, wenn genau dieser Gegner in
 * genau dieser Welle erscheint - also vielleicht nie beim Ausprobieren, und
 * dann beim Spielen. Deshalb wird hier gegen die Spieldaten geprueft und
 * nicht gegen eine Liste, die jemand von Hand pflegt.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '@data/index';
import { KNETMODELLE } from '@render3d/knetmodelle';

const content = loadContent();

describe('Knetmodelle', () => {
  it('kennt jeden Gegner', () => {
    const fehlen = [...content.enemies.keys()].filter((id) => !KNETMODELLE.has(id));
    expect(fehlen).toEqual([]);
  });

  it('kennt jeden Turm in jeder Ausbaustufe', () => {
    const fehlen: string[] = [];
    for (const id of content.towers.keys()) {
      for (let stufe = 0; stufe < 4; stufe++) {
        if (!KNETMODELLE.has(`${id}_s${stufe}`)) fehlen.push(`${id}_s${stufe}`);
      }
    }
    expect(fehlen).toEqual([]);
  });

  it('kennt jedes Geschoss', () => {
    // Leuchtfeuer, Alchemieturm und Spaehturm schiessen nicht; ihr
    // Geschossmodell ist leer, und das ist kein fehlendes Modell.
    const gebraucht = new Set(
      [...content.towers.values()].map((t) => t.projectileModel).filter((id) => id !== ''),
    );
    const fehlen = [...gebraucht].filter((id) => !KNETMODELLE.has(id));
    expect(fehlen).toEqual([]);
  });

  it('kennt jede Requisite jeder Karte', () => {
    const gebraucht = new Set<string>();
    for (const level of content.levels.values()) {
      for (const prop of level.props) gebraucht.add(prop.model);
    }
    const fehlen = [...gebraucht].filter((id) => !KNETMODELLE.has(id));
    expect(fehlen).toEqual([]);
  });

  it('gibt jedem Modell mindestens einen Koerper', () => {
    const leer = [...KNETMODELLE.values()].filter(
      (m) => m.parts.length === 0 || m.parts.every((t) => t.boxes.length === 0),
    );
    expect(leer.map((m) => m.id)).toEqual([]);
  });
});
