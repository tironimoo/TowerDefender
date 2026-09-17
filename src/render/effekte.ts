/**
 * Partikel, Blitze und aufsteigende Zahlen.
 *
 * Diese Schicht entscheidet mehr ueber den Qualitaetseindruck als die Modelle.
 * Ein Treffer ohne Rueckmeldung fuehlt sich tot an, egal wie gut er aussieht.
 * Alles hier ist rein kosmetisch und beeinflusst die Simulation nie.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { DamageType } from '@sim/index';

interface Partikel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  leben: number;
  maximal: number;
  groesse: number;
  farbe: number;
  schwerkraft: number;
}

interface Linie {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  leben: number;
  maximal: number;
  farbe: number;
  breite: number;
}

interface Zahl {
  readonly text: Text;
  leben: number;
  maximal: number;
  vy: number;
}

const FARBE_JE_ART: Readonly<Record<DamageType, number>> = {
  physisch: 0xf2e6c9,
  feuer: 0xff8a3c,
  arkan: 0xc4b5fd,
};

const MAX_PARTIKEL = 900;

export class Effekte {
  readonly container = new Container();
  private readonly zeichnung = new Graphics();
  private readonly texte = new Container();
  private readonly partikel: Partikel[] = [];
  private readonly linien: Linie[] = [];
  private readonly zahlen: Zahl[] = [];
  private readonly zahlStil = new TextStyle({
    fill: 0xffffff,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    stroke: { color: 0x11131a, width: 3 },
  });

  constructor() {
    this.container.addChild(this.zeichnung, this.texte);
  }

  leere(): void {
    this.partikel.length = 0;
    this.linien.length = 0;
    for (const zahl of this.zahlen) zahl.text.destroy();
    this.zahlen.length = 0;
    this.zeichnung.clear();
  }

  private stosseAus(
    x: number,
    y: number,
    anzahl: number,
    farbe: number,
    kraft: number,
    dauer: number,
    groesse: number,
  ): void {
    if (this.partikel.length > MAX_PARTIKEL) return;
    for (let i = 0; i < anzahl; i++) {
      const winkel = (i / anzahl) * Math.PI * 2 + (x + y) * 0.37;
      const tempo = kraft * (0.5 + ((i * 37) % 10) / 10);
      this.partikel.push({
        x,
        y,
        vx: Math.cos(winkel) * tempo,
        vy: Math.sin(winkel) * tempo * 0.5 - kraft * 0.4,
        leben: dauer,
        maximal: dauer,
        groesse,
        farbe,
        schwerkraft: 160,
      });
    }
  }

  treffer(x: number, y: number, art: DamageType, abgeprallt: boolean): void {
    const farbe = abgeprallt ? 0x8b98a5 : FARBE_JE_ART[art];
    this.stosseAus(x, y - 16, abgeprallt ? 3 : 5, farbe, abgeprallt ? 30 : 55, 0.3, 3);
  }

  tod(x: number, y: number): void {
    this.stosseAus(x, y - 14, 10, 0xe8dcc0, 80, 0.5, 4);
  }

  blitz(x1: number, y1: number, x2: number, y2: number): void {
    this.linien.push({
      x1,
      y1: y1 - 18,
      x2,
      y2: y2 - 18,
      leben: 0.14,
      maximal: 0.14,
      farbe: 0x9fe4ff,
      breite: 3,
    });
  }

  stoerung(x: number, y: number): void {
    this.stosseAus(x, y - 30, 8, 0xff6a6a, 45, 0.45, 3);
  }

  durchbruch(x: number, y: number): void {
    this.stosseAus(x, y - 10, 14, 0xff5c5c, 90, 0.6, 4);
  }

  bossphase(x: number, y: number): void {
    this.stosseAus(x, y - 30, 22, 0xc8a0ff, 120, 0.8, 5);
  }

  zahl(x: number, y: number, inhalt: string, farbe: number): void {
    if (this.zahlen.length > 40) return;
    const text = new Text({ text: inhalt, style: this.zahlStil });
    text.tint = farbe;
    text.anchor.set(0.5, 1);
    text.position.set(x, y - 30);
    this.texte.addChild(text);
    this.zahlen.push({ text, leben: 0.9, maximal: 0.9, vy: -34 });
  }

  aktualisiere(dt: number): void {
    this.zeichnung.clear();

    for (let i = this.partikel.length - 1; i >= 0; i--) {
      const p = this.partikel[i];
      if (p === undefined) continue;
      p.leben -= dt;
      if (p.leben <= 0) {
        this.partikel.splice(i, 1);
        continue;
      }
      p.vy += p.schwerkraft * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const anteil = p.leben / p.maximal;
      this.zeichnung
        .rect(p.x - p.groesse / 2, p.y - p.groesse / 2, p.groesse, p.groesse)
        .fill({ color: p.farbe, alpha: Math.min(1, anteil * 1.4) });
    }

    for (let i = this.linien.length - 1; i >= 0; i--) {
      const l = this.linien[i];
      if (l === undefined) continue;
      l.leben -= dt;
      if (l.leben <= 0) {
        this.linien.splice(i, 1);
        continue;
      }
      const anteil = l.leben / l.maximal;
      this.zeichnung
        .moveTo(l.x1, l.y1)
        .lineTo(l.x2, l.y2)
        .stroke({ color: l.farbe, width: l.breite * anteil + 1, alpha: anteil });
    }

    for (let i = this.zahlen.length - 1; i >= 0; i--) {
      const z = this.zahlen[i];
      if (z === undefined) continue;
      z.leben -= dt;
      if (z.leben <= 0) {
        z.text.destroy();
        this.zahlen.splice(i, 1);
        continue;
      }
      z.text.position.y += z.vy * dt;
      z.text.alpha = Math.min(1, (z.leben / z.maximal) * 1.6);
    }
  }
}
