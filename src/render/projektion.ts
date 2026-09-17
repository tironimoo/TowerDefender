/**
 * Umrechnung zwischen Kachel- und Bildschirmkoordinaten.
 *
 * Die Karte ist dimetrisch im Verhaeltnis zwei zu eins. Eine Kachel ist 64
 * Pixel breit und 32 hoch. Dieselbe Kamera hat die Grafik-Pipeline benutzt,
 * siehe tools/voxel-render/atlas.ts.
 */

export const TILE_W = 64;
export const TILE_H = 32;

export interface Punkt {
  x: number;
  y: number;
}

/** Kachelkoordinate zu Bildschirmkoordinate. */
export function zuBildschirm(tx: number, ty: number, out: Punkt): void {
  out.x = (tx - ty) * (TILE_W / 2);
  out.y = (tx + ty) * (TILE_H / 2);
}

/** Bildschirmkoordinate zurueck zur Kachelkoordinate. */
export function zuKachel(sx: number, sy: number, out: Punkt): void {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  out.x = (a + b) / 2;
  out.y = (b - a) / 2;
}

/**
 * Tiefenwert fuer die Zeichenreihenfolge.
 * Wer weiter unten steht, wird spaeter gezeichnet und verdeckt damit richtig.
 */
export function tiefe(tx: number, ty: number): number {
  return (tx + ty) * 1000;
}

/** Blickrichtung in Grad zu einem der acht vorgerenderten Bilder. */
export function richtungZuIndex(gradAusWelt: number, richtungen: number): number {
  // Die Modelle blicken bei null Grad nach hinten. Die Kamera dreht die Welt
  // um 45 Grad, das wird hier ausgeglichen.
  const korrigiert = gradAusWelt + 45;
  const schritt = 360 / richtungen;
  const index = Math.round(korrigiert / schritt) % richtungen;
  return index < 0 ? index + richtungen : index;
}
