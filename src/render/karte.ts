/**
 * Die Karte: Boden, Weg, Fluessigkeiten, Bauplaetze und Requisiten.
 *
 * Der Boden aendert sich waehrend einer Partie nicht. Er wird einmal gebaut
 * und danach nur noch verschoben. Alles Bewegliche liegt in szene.ts.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import type { Content, LevelDef, Region } from '@sim/index';
import { atlas } from './atlas';
import { tiefe, zuBildschirm } from './projektion';

interface RegionKacheln {
  readonly boden: readonly string[];
  readonly weg: string;
  readonly fluessig: string;
}

const KACHELN_JE_REGION: Readonly<Record<Region, RegionKacheln>> = {
  wald: { boden: ['kachel_gras', 'kachel_gras2'], weg: 'kachel_weg', fluessig: 'kachel_wasser' },
  glut: {
    boden: ['kachel_basalt', 'kachel_basalt2'],
    weg: 'kachel_asche',
    fluessig: 'kachel_lava',
  },
  leere: {
    boden: ['kachel_leere', 'kachel_leere2'],
    weg: 'kachel_leereweg',
    fluessig: 'kachel_amethyst',
  },
};

/** Deterministische Abwechslung, damit der Boden nicht wie eine Tapete wirkt. */
function variante(x: number, y: number, anzahl: number): number {
  const h = Math.imul(x * 73856093 + y * 19349663, 83492791) >>> 0;
  return h % anzahl;
}

export interface KartenBild {
  readonly boden: Container;
  readonly requisiten: readonly Sprite[];
  /** Mittelpunkt der Karte in Bildschirmkoordinaten. */
  readonly mitteX: number;
  readonly mitteY: number;
  readonly breite: number;
  readonly hoehe: number;
}

export function baueKarte(level: LevelDef): KartenBild {
  const boden = new Container();
  const punkt = { x: 0, y: 0 };
  const satz = KACHELN_JE_REGION[level.region];

  for (let ty = 0; ty < level.hoehe; ty++) {
    for (let tx = 0; tx < level.breite; tx++) {
      const art = level.kacheln[ty * level.breite + tx] ?? 'boden';
      const name =
        art === 'weg'
          ? satz.weg
          : art === 'fluessig'
            ? satz.fluessig
            : (satz.boden[variante(tx, ty, satz.boden.length)] ?? satz.boden[0] ?? 'kachel_gras');

      const textur = atlas.textur('welt', name);
      if (textur === null) continue;
      const sprite = new Sprite(textur);
      const anker = atlas.anker('welt', name);
      sprite.anchor.set(anker.x, anker.y);
      zuBildschirm(tx + 0.5, ty + 0.5, punkt);
      sprite.position.set(punkt.x, punkt.y);
      boden.addChild(sprite);
    }
  }

  // Wegkacheln ausserhalb der Karte: der Zugang und der Ausgang.
  for (const feld of level.randWeg) {
    const textur = atlas.textur('welt', satz.weg);
    if (textur === null) continue;
    const sprite = new Sprite(textur);
    const anker = atlas.anker('welt', satz.weg);
    sprite.anchor.set(anker.x, anker.y);
    zuBildschirm(feld.x + 0.5, feld.y + 0.5, punkt);
    sprite.position.set(punkt.x, punkt.y);
    sprite.alpha = 0.75;
    boden.addChild(sprite);
  }

  // Bauplaetze als Plattform obendrauf.
  for (const slot of level.buildSlots) {
    const textur = atlas.textur('welt', 'kachel_plattform');
    if (textur === null) continue;
    const sprite = new Sprite(textur);
    const anker = atlas.anker('welt', 'kachel_plattform');
    sprite.anchor.set(anker.x, anker.y);
    zuBildschirm(slot.x, slot.y, punkt);
    sprite.position.set(punkt.x, punkt.y);
    sprite.alpha = slot.aufWeg ? 0.55 : 1;
    boden.addChild(sprite);
  }

  boden.addChild(zeichneWegfuehrung(level));

  const requisiten: Sprite[] = [];
  for (const prop of level.props) {
    const key = `${prop.model}_d${prop.dir}`;
    const textur = atlas.textur('welt', key);
    if (textur === null) continue;
    const sprite = new Sprite(textur);
    const anker = atlas.anker('welt', key);
    sprite.anchor.set(anker.x, anker.y);
    zuBildschirm(prop.x, prop.y, punkt);
    sprite.position.set(punkt.x, punkt.y);
    sprite.zIndex = tiefe(prop.x, prop.y);
    requisiten.push(sprite);
  }

  // Ausmasse der Karte in Bildschirmkoordinaten bestimmen.
  const ecken = [
    { x: 0, y: 0 },
    { x: level.breite, y: 0 },
    { x: 0, y: level.hoehe },
    { x: level.breite, y: level.hoehe },
  ].map((ecke) => {
    zuBildschirm(ecke.x, ecke.y, punkt);
    return { x: punkt.x, y: punkt.y };
  });
  const minX = Math.min(...ecken.map((e) => e.x));
  const maxX = Math.max(...ecken.map((e) => e.x));
  const minY = Math.min(...ecken.map((e) => e.y));
  const maxY = Math.max(...ecken.map((e) => e.y));

  return {
    boden,
    requisiten,
    mitteX: (minX + maxX) / 2,
    mitteY: (minY + maxY) / 2,
    breite: maxX - minX,
    hoehe: maxY - minY,
  };
}

/**
 * Richtungspfeile auf dem Weg sowie Ein- und Ausgang.
 *
 * Ohne sie muss man den Weg auf einer neuen Karte suchen. Mit ihnen sieht man
 * ihn in einer halben Sekunde, und genau darum geht es auf einem kleinen
 * Bildschirm.
 */
function zeichneWegfuehrung(level: LevelDef): Graphics {
  const zeichnung = new Graphics();
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 0 };

  for (const pfad of level.paths) {
    // Pfeile in festen Abstaenden entlang jedes Segments.
    for (let i = 1; i < pfad.length; i++) {
      const von = pfad[i - 1];
      const nach = pfad[i];
      if (von === undefined || nach === undefined) continue;
      const laenge = Math.hypot(nach.x - von.x, nach.y - von.y);
      const anzahl = Math.max(1, Math.round(laenge / 2.6));
      for (let k = 0; k < anzahl; k++) {
        const t = (k + 0.5) / anzahl;
        const mx = von.x + (nach.x - von.x) * t;
        const my = von.y + (nach.y - von.y) * t;
        const rx = (nach.x - von.x) / laenge;
        const ry = (nach.y - von.y) / laenge;
        zuBildschirm(mx - rx * 0.45, my - ry * 0.45, a);
        zuBildschirm(mx + rx * 0.45, my + ry * 0.45, b);
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const nl = Math.hypot(nx, ny) || 1;
        const breite = 8;
        zeichnung
          .moveTo(b.x, b.y)
          .lineTo(a.x + (nx / nl) * breite, a.y + (ny / nl) * breite)
          .lineTo(a.x - (nx / nl) * breite, a.y - (ny / nl) * breite)
          .closePath()
          .fill({ color: 0xffffff, alpha: 0.2 });
      }
    }

    const anfang = pfad[0];
    const ende = pfad[pfad.length - 1];
    if (anfang !== undefined) {
      zuBildschirm(anfang.x, anfang.y, a);
      zeichnung
        .ellipse(a.x, a.y, 26, 13)
        .fill({ color: 0xff6b6b, alpha: 0.2 })
        .stroke({ color: 0xff8f8f, width: 2, alpha: 0.75 });
    }
    if (ende !== undefined) {
      zuBildschirm(ende.x, ende.y, b);
      zeichnung
        .ellipse(b.x, b.y, 30, 15)
        .fill({ color: 0x7fd4ff, alpha: 0.18 })
        .stroke({ color: 0x9fe4ff, width: 3, alpha: 0.85 });
      zeichnung
        .ellipse(b.x, b.y, 18, 9)
        .stroke({ color: 0x9fe4ff, width: 2, alpha: 0.5 });
    }
  }

  return zeichnung;
}

/**
 * Alle Sprite-Blaetter, die eine Karte braucht.
 *
 * Es wird nur geladen, was auf dieser Karte vorkommt: die Welt, die vier
 * Tuerme des Loadouts und die Gegner der Wellen samt allem, was sie rufen
 * oder wozu sie zerfallen.
 */
export function blaetterFuer(
  content: Content,
  level: LevelDef,
  loadout: readonly string[],
): string[] {
  const namen = new Set<string>(['welt']);
  for (const turm of loadout) namen.add(`turm-${turm}`);

  const offen: string[] = [];
  for (const welle of level.waves) {
    for (const gruppe of welle.groups) offen.push(gruppe.enemyId);
  }

  const gesehen = new Set<string>();
  while (offen.length > 0) {
    const id = offen.pop();
    if (id === undefined || gesehen.has(id)) continue;
    gesehen.add(id);
    const def = content.enemies.get(id);
    if (def === undefined) continue;
    namen.add(def.sheet);
    if (def.behaviour.kind === 'teilt') offen.push(def.behaviour.childId);
    if (def.boss !== null) {
      for (const phase of def.boss.phasen) {
        if (phase.ruft !== null) offen.push(phase.ruft.enemyId);
      }
    }
  }

  return [...namen];
}
