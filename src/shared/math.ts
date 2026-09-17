/** Kleine Mathematikhelfer. Bewusst frei von Zustand und ohne Zufall. */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Quadrierter Abstand. Spart die Wurzel bei reinen Vergleichen. */
export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Rundet auf sechs Nachkommastellen. Haelt Ausgaben von Messlaeufen lesbar. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
