/**
 * Gemeinsame Beschreibung der Sprite-Blaetter.
 *
 * Diese Datei wird sowohl von der Renderseite als auch vom Spiel benutzt.
 * Deshalb enthaelt sie nur Typen und Konstanten, keine Zeichenlogik.
 */

/** Pixel je Voxel. Ergibt zusammen mit der Kamera eine Kachel von 64 mal 32. */
export const VOXEL_SCALE = 64 / (16 * Math.SQRT2);

/** Breite einer Bodenkachel in Pixeln. */
export const TILE_WIDTH = 64;
/** Hoehe einer Bodenkachel in Pixeln. Immer die halbe Breite. */
export const TILE_HEIGHT = 32;

/** Anzahl der vorgerenderten Blickrichtungen. */
export const DIRECTIONS = 8;
/** Bilder einer Bewegungsschleife. */
export const WALK_FRAMES = 4;

export interface AtlasFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Ankerpunkt im Bild: der Punkt, der auf dem Boden steht. */
  readonly ax: number;
  readonly ay: number;
}

export interface AtlasSheet {
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

/** Bildmasse je Art von Modell. */
export const RAHMEN = {
  gegner: { w: 112, h: 128, ax: 56, ay: 112 },
  boss: { w: 176, h: 192, ax: 88, ay: 164 },
  turm: { w: 112, h: 128, ax: 56, ay: 112 },
  kachel: { w: 64, h: 48, ax: 32, ay: 16 },
  prop: { w: 96, h: 96, ax: 48, ay: 80 },
  schuss: { w: 40, h: 40, ax: 20, ay: 20 },
} as const;

export function frameKeyGegner(id: string, dir: number, frame: number): string {
  return `${id}_d${dir}_f${frame}`;
}

export function frameKeyTurm(id: string, level: number, dir: number): string {
  return `${id}_s${level}_d${dir}`;
}

export function frameKeyGerichtet(id: string, dir: number): string {
  return `${id}_d${dir}`;
}
