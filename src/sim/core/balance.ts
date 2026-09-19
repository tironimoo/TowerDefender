/**
 * Regeln der Wirtschaft und der Wellensteigerung.
 *
 * Diese Werte gehoeren zum Regelwerk, nicht zu einzelnen Inhalten. Werte
 * einzelner Tuerme und Gegner stehen in src/data. Siehe docs/05-startwerte.md.
 */

/**
 * Leben je Welle gegenueber der vorherigen.
 *
 * Zinseszins: die Zahl wirkt klein, entscheidet aber ueber das Ende. Bei 1.095
 * war die letzte Welle einer 25-Wellen-Karte 8,8-mal so zaeh wie die erste,
 * bei 1.085 sind es 7,1. Die fruehen Wellen merken davon fast nichts - genau
 * deshalb ist das die richtige Schraube fuer ein Spiel, das erst spaet kippt.
 */
export const WAVE_HEALTH_GROWTH = 1.085;

/**
 * Goldbelohnung je Welle. Langsamer als das Leben, aber nicht beliebig
 * langsamer.
 *
 * Der Abstand zwischen beiden Zahlen ist die Steigung der Kampagne. Bei 1.095
 * gegen 1.06 waechst die Bedrohung bis Welle 25 auf das 2,2-fache dessen, was
 * der Spieler bezahlen kann - das ist kein Anstieg mehr, das ist eine Wand.
 * Bei 1.075 sind es 1,56: es wird weiter schwerer, aber in einem Tempo, das
 * sich mit besserem Spiel beantworten laesst.
 */
export const WAVE_GOLD_GROWTH = 1.075;

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
