/**
 * Oeffentliche Schnittstelle der Simulation.
 *
 * Alles ausserhalb von `src/sim` benutzt ausschliesslich das, was hier steht.
 * Die Simulation kennt weder PixiJS noch Eingabegeraete noch Echtzeit.
 */

export {
  createWorld,
  applyCommand,
  findTower,
  findEnemy,
  ausbauKosten,
  faehigkeitKosten,
  faehigkeitRang,
} from './core/world';
export { step, drainEvents } from './core/step';
export { createRng } from './core/rng';
export type { Rng } from './core/rng';
export { buildRoute, positionOnRoute, routeLengthFor } from './core/route';
export { resistanceFactor } from './systems/damage';
export { waveDefFor } from './systems/waves';
export { erzeugeGegner } from './core/spawn';
export {
  waveHealthFactor,
  waveGoldFactor,
  SELL_REFUND,
  EARLY_START_BONUS_PER_SECOND,
  WAVE_HEALTH_GROWTH,
  WAVE_GOLD_GROWTH,
} from './core/balance';
export * from './model/types';
export type { World } from './model/world';
export type { CreateWorldOptions } from './core/world';
