/**
 * Darstellung der beweglichen Dinge.
 *
 * Diese Schicht liest nur den Zustand der Simulation und spielt deren
 * Ereignisse ab. Sie veraendert nichts daran. Genau deshalb kann die
 * Simulation ohne sie laufen, siehe docs/03-architektur.md.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import type { Enemy, SimEvent, World } from '@sim/index';
import { atlas } from './atlas';
import { richtungZuIndex, tiefe, zuBildschirm } from './projektion';
import { Effekte } from './effekte';

const RICHTUNGEN = 8;
const LAUFBILDER = 4;

interface Ansicht {
  readonly sprite: Sprite;
  blatt: string;
  key: string;
}

const FARBE_LEBEN = 0x7fd46a;
const FARBE_SCHILD = 0x7fd4ff;
const FARBE_LEER = 0x1b1d24;
const FARBE_BOSS = 0xff7a5c;

export class Szene {
  /** Alles, was sich nach Tiefe sortiert. */
  readonly welt = new Container();
  /** Balken und Markierungen ueber der Welt. */
  readonly ueberlagerung = new Container();
  readonly effekte: Effekte;

  private readonly gegnerAnsichten = new Map<number, Ansicht>();
  private readonly turmAnsichten = new Map<number, Ansicht>();
  private readonly geschossAnsichten = new Map<number, Ansicht>();
  private readonly balken = new Graphics();
  private readonly markierung = new Graphics();
  private readonly punkt = { x: 0, y: 0 };
  /** Gegner, die gerade aufblitzen, mit Restdauer in Sekunden. */
  private readonly blitzen = new Map<number, number>();

  constructor() {
    this.welt.sortableChildren = true;
    this.effekte = new Effekte();
    this.ueberlagerung.addChild(this.markierung, this.balken, this.effekte.container);
  }

  /** Requisiten der Karte einhaengen. Sie sortieren sich mit den Figuren. */
  fuegeRequisitenEin(requisiten: readonly Sprite[]): void {
    for (const sprite of requisiten) this.welt.addChild(sprite);
  }

  leere(): void {
    for (const ansicht of this.gegnerAnsichten.values()) ansicht.sprite.destroy();
    for (const ansicht of this.turmAnsichten.values()) ansicht.sprite.destroy();
    for (const ansicht of this.geschossAnsichten.values()) ansicht.sprite.destroy();
    this.gegnerAnsichten.clear();
    this.turmAnsichten.clear();
    this.geschossAnsichten.clear();
    this.welt.removeChildren();
    this.balken.clear();
    this.markierung.clear();
    this.effekte.leere();
    this.blitzen.clear();
  }

  /** Nimmt die Ereignisse eines Schrittes entgegen und erzeugt Effekte daraus. */
  verarbeite(ereignisse: readonly SimEvent[], world: World): void {
    for (const ereignis of ereignisse) {
      switch (ereignis.type) {
        case 'treffer': {
          zuBildschirm(ereignis.x, ereignis.y, this.punkt);
          this.effekte.treffer(this.punkt.x, this.punkt.y, ereignis.damageType, ereignis.abgeprallt);
          if (!ereignis.abgeprallt) this.blitzen.set(ereignis.enemyId, 0.08);
          break;
        }
        case 'gegner-gestorben': {
          zuBildschirm(ereignis.x, ereignis.y, this.punkt);
          this.effekte.tod(this.punkt.x, this.punkt.y);
          this.effekte.zahl(this.punkt.x, this.punkt.y, `+${ereignis.gold}`, 0xe6b84a);
          break;
        }
        case 'kettenblitz': {
          zuBildschirm(ereignis.vonX, ereignis.vonY, this.punkt);
          const vonX = this.punkt.x;
          const vonY = this.punkt.y;
          zuBildschirm(ereignis.nachX, ereignis.nachY, this.punkt);
          this.effekte.blitz(vonX, vonY, this.punkt.x, this.punkt.y);
          break;
        }
        case 'turm-gestoert': {
          zuBildschirm(ereignis.x, ereignis.y, this.punkt);
          this.effekte.stoerung(this.punkt.x, this.punkt.y);
          break;
        }
        case 'gegner-durch': {
          const ziel = world.routes[0]?.points.at(-1);
          if (ziel !== undefined) {
            zuBildschirm(ziel.x, ziel.y, this.punkt);
            this.effekte.durchbruch(this.punkt.x, this.punkt.y);
          }
          break;
        }
        case 'bossphase': {
          const boss = world.enemies.items.find((e) => e.active && e.id === ereignis.enemyId);
          if (boss !== undefined) {
            zuBildschirm(boss.x, boss.y, this.punkt);
            this.effekte.bossphase(this.punkt.x, this.punkt.y);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  /**
   * Zeichnet den aktuellen Zustand.
   * `dt` ist die vergangene Zeit in Sekunden, nur fuer Effekte und Blinken.
   */
  zeichne(world: World, dt: number): void {
    this.aktualisiereGegner(world);
    this.aktualisiereTuerme(world);
    this.aktualisiereGeschosse(world);
    this.zeichneBalken(world);
    this.effekte.aktualisiere(dt);

    for (const [id, rest] of this.blitzen) {
      const neu = rest - dt;
      if (neu <= 0) this.blitzen.delete(id);
      else this.blitzen.set(id, neu);
    }
  }

  private hole(
    karte: Map<number, Ansicht>,
    id: number,
    blatt: string,
    key: string,
  ): Ansicht | null {
    let ansicht = karte.get(id);
    if (ansicht === undefined) {
      const textur = atlas.textur(blatt, key);
      if (textur === null) return null;
      const sprite = new Sprite(textur);
      const anker = atlas.anker(blatt, key);
      sprite.anchor.set(anker.x, anker.y);
      ansicht = { sprite, blatt, key };
      karte.set(id, ansicht);
      this.welt.addChild(sprite);
      return ansicht;
    }
    if (ansicht.key !== key || ansicht.blatt !== blatt) {
      const textur = atlas.textur(blatt, key);
      if (textur !== null) {
        ansicht.sprite.texture = textur;
        const anker = atlas.anker(blatt, key);
        ansicht.sprite.anchor.set(anker.x, anker.y);
        ansicht.key = key;
        ansicht.blatt = blatt;
      }
    }
    return ansicht;
  }

  private entferneFehlende(karte: Map<number, Ansicht>, lebende: Set<number>): void {
    for (const [id, ansicht] of karte) {
      if (lebende.has(id)) continue;
      ansicht.sprite.destroy();
      karte.delete(id);
    }
  }

  private aktualisiereGegner(world: World): void {
    const lebende = new Set<number>();
    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      lebende.add(enemy.id);

      const def = world.content.enemies.get(enemy.defId);
      if (def === undefined) continue;

      const dir = richtungZuIndex(enemy.heading, RICHTUNGEN);
      // Das Laufbild haengt an der zurueckgelegten Strecke, nicht an der Zeit.
      // Dadurch passt der Schritt zum Tempo, auch im Zeitraffer.
      const bild = Math.floor(enemy.travelled * 2.2) % LAUFBILDER;
      const key = `${enemy.defId}_d${dir}_f${bild}`;
      const ansicht = this.hole(this.gegnerAnsichten, enemy.id, def.sheet, key);
      if (ansicht === null) continue;

      zuBildschirm(enemy.x, enemy.y, this.punkt);
      ansicht.sprite.position.set(this.punkt.x, this.punkt.y);
      ansicht.sprite.zIndex = tiefe(enemy.x, enemy.y);
      ansicht.sprite.tint = this.faerbung(enemy);
      ansicht.sprite.alpha = enemy.invisible && !enemy.revealed ? 0.45 : 1;
    }
    this.entferneFehlende(this.gegnerAnsichten, lebende);
  }

  /** Farbstich aus dem Zustand: Frost blau, Brand orange, Treffer hell. */
  private faerbung(enemy: Enemy): number {
    if (this.blitzen.has(enemy.id)) return 0xffffff;
    if (enemy.invulnerableTicks > 0) return 0xc8a0ff;
    if (enemy.burnTicksLeft > 0) return 0xffa86a;
    if (enemy.slowFactor >= 0.99) return 0xd7e4ea;
    if (enemy.slowTicksLeft > 0) return 0x9fd8f0;
    return 0xffffff;
  }

  private aktualisiereTuerme(world: World): void {
    const lebende = new Set<number>();
    for (const tower of world.towers.items) {
      if (!tower.active) continue;
      lebende.add(tower.id);

      const dir = richtungZuIndex(tower.heading, RICHTUNGEN);
      const key = `${tower.defId}_s${tower.level}_d${dir}`;
      const ansicht = this.hole(this.turmAnsichten, tower.id, `turm-${tower.defId}`, key);
      if (ansicht === null) continue;

      zuBildschirm(tower.x, tower.y, this.punkt);
      ansicht.sprite.position.set(this.punkt.x, this.punkt.y);
      ansicht.sprite.zIndex = tiefe(tower.x, tower.y);
      ansicht.sprite.tint = tower.stunTicks > 0 ? 0x8a8ea0 : 0xffffff;
    }
    this.entferneFehlende(this.turmAnsichten, lebende);
  }

  private aktualisiereGeschosse(world: World): void {
    const lebende = new Set<number>();
    for (const projectile of world.projectiles.items) {
      if (!projectile.active || projectile.model === '') continue;
      lebende.add(projectile.id);

      const dx = projectile.targetX - projectile.x;
      const dy = projectile.targetY - projectile.y;
      const grad = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const key = `${projectile.model}_d${richtungZuIndex(grad, RICHTUNGEN)}`;
      const ansicht = this.hole(this.geschossAnsichten, projectile.id, 'welt', key);
      if (ansicht === null) continue;

      zuBildschirm(projectile.x, projectile.y, this.punkt);
      // Geschosse fliegen ueber dem Boden, nicht darauf.
      ansicht.sprite.position.set(this.punkt.x, this.punkt.y - 18);
      ansicht.sprite.zIndex = tiefe(projectile.x, projectile.y) + 500;
    }
    this.entferneFehlende(this.geschossAnsichten, lebende);
  }

  private zeichneBalken(world: World): void {
    this.balken.clear();
    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      const def = world.content.enemies.get(enemy.defId);
      const istBoss = def?.boss !== null && def !== undefined;
      // Unbeschaedigte einfache Gegner brauchen keinen Balken.
      if (!istBoss && enemy.health >= enemy.maxHealth && enemy.shield <= 0) continue;

      zuBildschirm(enemy.x, enemy.y, this.punkt);
      const breite = istBoss ? 54 : 26;
      const hoehe = istBoss ? 6 : 4;
      const x = this.punkt.x - breite / 2;
      const y = this.punkt.y - (istBoss ? 74 : 44);

      this.balken.rect(x - 1, y - 1, breite + 2, hoehe + 2).fill({ color: FARBE_LEER, alpha: 0.75 });
      const anteil = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
      this.balken
        .rect(x, y, breite * anteil, hoehe)
        .fill({ color: istBoss ? FARBE_BOSS : FARBE_LEBEN });

      if (enemy.shield > 0 && enemy.maxShield > 0) {
        const schildAnteil = Math.max(0, Math.min(1, enemy.shield / enemy.maxShield));
        this.balken.rect(x, y - hoehe - 1, breite * schildAnteil, 2).fill({ color: FARBE_SCHILD });
      }
    }
  }

  /** Reichweitenring und Bauplatzmarkierung. */
  zeigeMarkierung(
    world: World,
    auswahl: { art: 'platz' | 'turm'; index: number } | null,
    reichweite: number,
  ): void {
    this.markierung.clear();
    if (auswahl === null) return;

    let x = 0;
    let y = 0;
    if (auswahl.art === 'platz') {
      const slot = world.level.buildSlots[auswahl.index];
      if (slot === undefined) return;
      zuBildschirm(slot.x, slot.y, this.punkt);
      x = this.punkt.x;
      y = this.punkt.y;
    } else {
      const tower = world.towers.items.find((t) => t.active && t.id === auswahl.index);
      if (tower === undefined) return;
      zuBildschirm(tower.x, tower.y, this.punkt);
      x = this.punkt.x;
      y = this.punkt.y;
    }

    if (reichweite > 0) {
      // Die Reichweite ist rund in Kacheln, auf dem Bildschirm also eine Ellipse.
      this.markierung
        .ellipse(x, y, reichweite * 32, reichweite * 16)
        .fill({ color: 0x7fd4ff, alpha: 0.12 })
        .stroke({ color: 0x9fe4ff, width: 2, alpha: 0.7 });
    }
    this.markierung
      .ellipse(x, y, 30, 15)
      .stroke({ color: 0xffe9a8, width: 2, alpha: 0.9 });
  }
}

