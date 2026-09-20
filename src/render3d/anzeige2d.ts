/**
 * Balken, Steine und Schadenszahlen auf einer Flaeche ueber der Szene.
 *
 * Alles, was flach bleiben und gestochen scharf sein soll, wird hier
 * gezeichnet statt in die Szene gestellt. Das hat einen handfesten Grund:
 * ein Lebensbalken im Raum wird mit der Entfernung klein und schief, und
 * gerade dann braucht man ihn am dringendsten. Auf dieser Flaeche ist er
 * immer gleich gross und immer lesbar.
 *
 * Die Flaeche liegt in Bildschirmpunkten, nicht in Geraetepunkten; wo etwas
 * hingehoert, sagt die Szene, indem sie einen Weltpunkt auf den Bildschirm
 * wirft.
 */

import type { World } from '@sim/index';

const FARBE_LEBEN = '#7fd46a';
const FARBE_SCHILD = '#7fd4ff';
const FARBE_LEER = 'rgba(27, 29, 36, 0.78)';
const FARBE_BOSS = '#ff7a5c';
const FARBE_FAEHIGKEIT = ['#ffd479', '#8fd6ff'] as const;

interface Zahl {
  x: number;
  y: number;
  text: string;
  farbe: string;
  rest: number;
}

export class Anzeige2D {
  readonly leinwand = document.createElement('canvas');
  private readonly stift: CanvasRenderingContext2D;
  private readonly zahlen: Zahl[] = [];
  private breite = 1;
  private hoehe = 1;

  constructor() {
    this.leinwand.style.position = 'absolute';
    this.leinwand.style.inset = '0';
    this.leinwand.style.pointerEvents = 'none';
    const stift = this.leinwand.getContext('2d');
    if (stift === null) throw new Error('Kein 2D-Zeichenbereich fuer die Anzeige.');
    this.stift = stift;
  }

  setzeGroesse(breite: number, hoehe: number): void {
    this.breite = Math.max(1, breite);
    this.hoehe = Math.max(1, hoehe);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.leinwand.width = Math.round(this.breite * dpr);
    this.leinwand.height = Math.round(this.hoehe * dpr);
    this.leinwand.style.width = `${this.breite}px`;
    this.leinwand.style.height = `${this.hoehe}px`;
    this.stift.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  zahl(x: number, y: number, text: string, farbe: string): void {
    // Hoechstens ein paar Dutzend gleichzeitig: bei einer dichten Welle
    // ueberdecken sich mehr ohnehin nur gegenseitig.
    if (this.zahlen.length > 40) this.zahlen.shift();
    this.zahlen.push({ x, y, text, farbe, rest: 0.9 });
  }

  leere(): void {
    this.zahlen.length = 0;
    this.stift.clearRect(0, 0, this.breite, this.hoehe);
  }

  /**
   * Zeichnet alles neu.
   *
   * `aufBildschirm` wirft einen Punkt der Welt auf die Flaeche und sagt, ob
   * er ueberhaupt vor der Kamera liegt.
   */
  zeichne(
    world: World,
    dt: number,
    aufBildschirm: (x: number, y: number, hoehe: number) => { x: number; y: number; sichtbar: boolean },
  ): void {
    const s = this.stift;
    s.clearRect(0, 0, this.breite, this.hoehe);

    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      const def = world.content.enemies.get(enemy.defId);
      const istBoss = def !== undefined && def.boss !== null;
      if (!istBoss && enemy.health >= enemy.maxHealth && enemy.shield <= 0) continue;

      const punkt = aufBildschirm(enemy.x, enemy.y, istBoss ? 2.6 : 1.7);
      if (!punkt.sichtbar) continue;
      const breite = istBoss ? 54 : 26;
      const hoehe = istBoss ? 6 : 4;
      const x = punkt.x - breite / 2;
      const y = punkt.y;

      s.fillStyle = FARBE_LEER;
      s.fillRect(x - 1, y - 1, breite + 2, hoehe + 2);
      const anteil = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
      s.fillStyle = istBoss ? FARBE_BOSS : FARBE_LEBEN;
      s.fillRect(x, y, breite * anteil, hoehe);

      if (enemy.shield > 0 && enemy.maxShield > 0) {
        s.fillStyle = FARBE_SCHILD;
        s.fillRect(x, y - hoehe - 1, breite * Math.min(1, enemy.shield / enemy.maxShield), 2);
      }
    }

    // Edelsteine ueber Tuermen mit gelernter Faehigkeit: je Faehigkeit eine
    // Reihe, je Rang ein Stein.
    for (const tower of world.towers.items) {
      if (!tower.active) continue;
      if (tower.faehigkeitA <= 0 && tower.faehigkeitB <= 0) continue;
      const punkt = aufBildschirm(tower.x, tower.y, 2.4);
      if (!punkt.sichtbar) continue;
      const raenge = [tower.faehigkeitA, tower.faehigkeitB];
      let reihe = 0;
      for (let i = 0; i < raenge.length; i++) {
        const rang = raenge[i] ?? 0;
        if (rang <= 0) continue;
        s.fillStyle = FARBE_FAEHIGKEIT[i] ?? '#ffffff';
        s.strokeStyle = 'rgba(27, 29, 36, 0.9)';
        s.lineWidth = 1.5;
        const y = punkt.y - reihe * 12;
        const start = punkt.x - ((rang - 1) * 12) / 2;
        for (let r = 0; r < rang; r++) {
          const x = start + r * 12;
          s.beginPath();
          s.moveTo(x, y - 5);
          s.lineTo(x + 5, y);
          s.lineTo(x, y + 5);
          s.lineTo(x - 5, y);
          s.closePath();
          s.fill();
          s.stroke();
        }
        reihe++;
      }
    }

    s.font = '600 15px system-ui, sans-serif';
    s.textAlign = 'center';
    for (let i = this.zahlen.length - 1; i >= 0; i--) {
      const zahl = this.zahlen[i];
      if (zahl === undefined) continue;
      zahl.rest -= dt;
      if (zahl.rest <= 0) {
        this.zahlen.splice(i, 1);
        continue;
      }
      const auf = 1 - zahl.rest / 0.9;
      s.globalAlpha = Math.min(1, zahl.rest * 2.4);
      s.fillStyle = 'rgba(12, 14, 18, 0.7)';
      s.fillText(zahl.text, zahl.x + 1, zahl.y - auf * 26 + 1);
      s.fillStyle = zahl.farbe;
      s.fillText(zahl.text, zahl.x, zahl.y - auf * 26);
    }
    s.globalAlpha = 1;
  }
}
