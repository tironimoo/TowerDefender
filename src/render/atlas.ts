/**
 * Laden der Sprite-Blaetter.
 *
 * Es gibt ein Blatt je Modell, damit eine Karte nur laedt, was sie braucht.
 * Siehe docs/03-architektur.md, Abschnitt Grafik-Pipeline.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

export interface AtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly ax: number;
  readonly ay: number;
}

interface BlattDaten {
  readonly name: string;
  readonly bild: string;
  readonly breite: number;
  readonly hoehe: number;
  readonly rahmen: Readonly<Record<string, AtlasFrame>>;
}

export interface AtlasIndex {
  readonly erzeugt: string;
  readonly kachelBreite: number;
  readonly kachelHoehe: number;
  readonly richtungen: number;
  readonly laufbilder: number;
  readonly blaetter: readonly string[];
}

const BASIS = 'atlas';

export class Atlas {
  private readonly blaetter = new Map<string, BlattDaten>();
  private readonly texturen = new Map<string, Texture>();
  private index: AtlasIndex | null = null;

  async ladeIndex(): Promise<AtlasIndex> {
    if (this.index !== null) return this.index;
    const antwort = await fetch(`${BASIS}/index.json`);
    if (!antwort.ok) throw new Error('Sprite-Verzeichnis fehlt. npm run assets ausfuehren.');
    this.index = (await antwort.json()) as AtlasIndex;
    return this.index;
  }

  /** Laedt mehrere Blaetter gleichzeitig. Bereits geladene werden uebersprungen. */
  async lade(namen: readonly string[]): Promise<void> {
    const offen = namen.filter((name) => !this.blaetter.has(name));
    await Promise.all(offen.map((name) => this.ladeBlatt(name)));
  }

  hatBlatt(name: string): boolean {
    return this.blaetter.has(name);
  }

  private async ladeBlatt(name: string): Promise<void> {
    const antwort = await fetch(`${BASIS}/${name}.json`);
    if (!antwort.ok) throw new Error(`Sprite-Blatt fehlt: ${name}`);
    const daten = (await antwort.json()) as BlattDaten;
    const quelle = await Assets.load<Texture>(`${BASIS}/${daten.bild}`);

    for (const [key, rahmen] of Object.entries(daten.rahmen)) {
      this.texturen.set(
        `${name}/${key}`,
        new Texture({
          source: quelle.source,
          frame: new Rectangle(rahmen.x, rahmen.y, rahmen.w, rahmen.h),
        }),
      );
    }
    this.blaetter.set(name, daten);
  }

  textur(blatt: string, key: string): Texture | null {
    return this.texturen.get(`${blatt}/${key}`) ?? null;
  }

  rahmen(blatt: string, key: string): AtlasFrame | null {
    return this.blaetter.get(blatt)?.rahmen[key] ?? null;
  }

  /** Ankerpunkt als Anteil der Bildgroesse, so wie PixiJS ihn erwartet. */
  anker(blatt: string, key: string): { x: number; y: number } {
    const rahmen = this.rahmen(blatt, key);
    if (rahmen === null) return { x: 0.5, y: 0.5 };
    return { x: rahmen.ax / rahmen.w, y: rahmen.ay / rahmen.h };
  }
}

export const atlas = new Atlas();
