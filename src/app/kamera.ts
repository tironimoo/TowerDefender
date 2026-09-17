/**
 * Kamera.
 *
 * Verschieben mit einem Finger, Zoomen mit zwei. Die Kamera bleibt immer so,
 * dass die Karte den Bildschirm ausfuellt oder mittig sitzt. Nichts daran
 * beruehrt die Simulation.
 */

import type { Container } from 'pixi.js';

export interface Ausmasse {
  readonly mitteX: number;
  readonly mitteY: number;
  readonly breite: number;
  readonly hoehe: number;
}

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;

export class Kamera {
  private zoom = 1;
  private x = 0;
  private y = 0;
  /** Verbleibende Erschuetterung in Sekunden und ihre Staerke in Pixeln. */
  private ruettelRest = 0;
  private ruettelStaerke = 0;
  private ruettelX = 0;
  private ruettelY = 0;

  constructor(
    private readonly wurzel: Container,
    private ausmasse: Ausmasse,
    private breite: number,
    private hoehe: number,
  ) {
    this.passeAn();
  }

  setzeAusmasse(ausmasse: Ausmasse): void {
    this.ausmasse = ausmasse;
    this.passeAn();
  }

  setzeBildschirm(breite: number, hoehe: number): void {
    this.breite = breite;
    this.hoehe = hoehe;
    this.begrenze();
    this.uebertrage();
  }

  /** Setzt Zoom und Ausschnitt so, dass die Karte gut sichtbar ist. */
  passeAn(): void {
    // Wenig Rand: die Karte soll den Bildschirm ausfuellen, ohne dass man
    // schieben muss, um ueberhaupt etwas zu sehen.
    const randX = 24;
    const randY = 96;
    const passend = Math.min(
      (this.breite - randX) / Math.max(1, this.ausmasse.breite),
      (this.hoehe - randY) / Math.max(1, this.ausmasse.hoehe),
    );
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, passend));
    this.x = this.breite / 2 - this.ausmasse.mitteX * this.zoom;
    this.y = this.hoehe / 2 - this.ausmasse.mitteY * this.zoom;
    this.begrenze();
    this.uebertrage();
  }

  verschiebe(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.begrenze();
    this.uebertrage();
  }

  /** Zoomt um einen Bildschirmpunkt herum, damit das Zusammenziehen sitzt. */
  zoome(faktor: number, umX: number, umY: number): void {
    const neu = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * faktor));
    const echterFaktor = neu / this.zoom;
    this.x = umX - (umX - this.x) * echterFaktor;
    this.y = umY - (umY - this.y) * echterFaktor;
    this.zoom = neu;
    this.begrenze();
    this.uebertrage();
  }

  /** Bildschirmkoordinate zu Weltkoordinate. */
  zurWelt(sx: number, sy: number, out: { x: number; y: number }): void {
    out.x = (sx - this.x) / this.zoom;
    out.y = (sy - this.y) / this.zoom;
  }

  /** Weltkoordinate zu Bildschirmkoordinate. */
  zumBildschirm(wx: number, wy: number, out: { x: number; y: number }): void {
    out.x = wx * this.zoom + this.x;
    out.y = wy * this.zoom + this.y;
  }

  get massstab(): number {
    return this.zoom;
  }

  /**
   * Kurze Erschuetterung.
   * Nur fuer Ereignisse, die weh tun: ein Durchbruch, ein Phasenwechsel eines
   * Bosses. Staendiges Ruetteln macht ein Spiel unlesbar.
   */
  ruettle(staerke: number, dauer = 0.28): void {
    this.ruettelStaerke = Math.max(this.ruettelStaerke, staerke);
    this.ruettelRest = Math.max(this.ruettelRest, dauer);
  }

  /** Muss jedes Bild aufgerufen werden, damit die Erschuetterung ausklingt. */
  aktualisiere(dt: number, tick: number): void {
    if (this.ruettelRest <= 0) {
      if (this.ruettelX !== 0 || this.ruettelY !== 0) {
        this.ruettelX = 0;
        this.ruettelY = 0;
        this.uebertrage();
      }
      return;
    }
    this.ruettelRest -= dt;
    const anteil = Math.max(0, this.ruettelRest / 0.28);
    const staerke = this.ruettelStaerke * anteil;
    this.ruettelX = Math.sin(tick * 1.7) * staerke;
    this.ruettelY = Math.cos(tick * 2.3) * staerke * 0.6;
    if (this.ruettelRest <= 0) this.ruettelStaerke = 0;
    this.uebertrage();
  }

  private begrenze(): void {
    const halbeBreite = (this.ausmasse.breite * this.zoom) / 2;
    const halbeHoehe = (this.ausmasse.hoehe * this.zoom) / 2;
    const mitteX = this.ausmasse.mitteX * this.zoom + this.x;
    const mitteY = this.ausmasse.mitteY * this.zoom + this.y;

    // Die Kartenmitte darf hoechstens bis zum Bildschirmrand wandern. So kann
    // man nie ins Leere scrollen und trotzdem jede Ecke erreichen.
    const minX = Math.min(this.breite - halbeBreite * 0.4, halbeBreite * 0.4);
    const maxX = Math.max(halbeBreite * 0.4, this.breite - halbeBreite * 0.4);
    const minY = Math.min(this.hoehe - halbeHoehe * 0.4, halbeHoehe * 0.4);
    const maxY = Math.max(halbeHoehe * 0.4, this.hoehe - halbeHoehe * 0.4);

    const neuMitteX = Math.max(minX, Math.min(maxX, mitteX));
    const neuMitteY = Math.max(minY, Math.min(maxY, mitteY));
    this.x += neuMitteX - mitteX;
    this.y += neuMitteY - mitteY;
  }

  private uebertrage(): void {
    this.wurzel.position.set(this.x + this.ruettelX, this.y + this.ruettelY);
    this.wurzel.scale.set(this.zoom);
  }
}
