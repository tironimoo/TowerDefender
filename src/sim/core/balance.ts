/**
 * Regeln der Wirtschaft und der Wellensteigerung.
 *
 * Diese Werte gehoeren zum Regelwerk, nicht zu einzelnen Inhalten. Werte
 * einzelner Tuerme und Gegner stehen in src/data. Siehe docs/05-startwerte.md.
 */

/** Leben je Welle gegenueber der vorherigen. */
export const WAVE_HEALTH_GROWTH = 1.095;

/** Goldbelohnung je Welle. Bewusst langsamer als das Leben. */
export const WAVE_GOLD_GROWTH = 1.06;

/** Gold je verbleibender Sekunde beim vorzeitigen Wellenstart. */
export const EARLY_START_BONUS_PER_SECOND = 1;

/** Anteil des Investierten, den ein Verkauf erstattet. */
export const SELL_REFUND = 0.7;

export function waveHealthFactor(waveNumber: number): number {
  return Math.pow(WAVE_HEALTH_GROWTH, waveNumber - 1);
}

export function waveGoldFactor(waveNumber: number): number {
  return Math.pow(WAVE_GOLD_GROWTH, waveNumber - 1);
}
