/**
 * Gesetzter Zufallsgenerator (mulberry32).
 *
 * Die Simulation nutzt ausschliesslich diesen Generator. `Math.random` ist in
 * `src/sim` durch eine Linterregel verboten. Gleicher Ausgangswert bedeutet
 * gleicher Spielverlauf, und darauf beruhen Wiederholungen, die woechentliche
 * Herausforderung und reproduzierbare Messlaeufe.
 */
export interface Rng {
  /** Gleichverteilt in [0, 1). */
  next(): number;
  /** Ganzzahl in [min, max], beide Grenzen eingeschlossen. */
  int(min: number, max: number): number;
  /** Gleichverteilt in [min, max). */
  range(min: number, max: number): number;
  /** Aktueller Zustand, damit ein Spielstand ihn sichern kann. */
  state(): number;
  seed: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    state: () => state,
  };
}
