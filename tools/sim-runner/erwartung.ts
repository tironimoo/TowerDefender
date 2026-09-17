/**
 * Erwartete Staerke eines Spielers.
 *
 * Ein Spieler, der Karte sieben erreicht, hat Forschung betrieben und seine
 * Tuerme gemeistert. Eine Karte ohne diese Boni zu messen, misst eine Lage,
 * die im Spiel nie vorkommt. Diese Kurve bildet ab, womit ein aufmerksamer
 * Spieler an dieser Stelle rechnen darf.
 *
 * Die Werte sind bewusst vorsichtig: wer weniger forscht, schafft die Karte
 * trotzdem, wenn er gut baut.
 */

import type { Boni } from '../../src/sim/index';
import { KEINE_BONI } from '../../src/sim/index';

export function erwarteteBoni(levelIndex: number): Boni {
  const stufe = Math.max(0, levelIndex);
  return {
    ...KEINE_BONI,
    globalerSchaden: 1 + 0.07 * stufe,
    globaleReichweite: 1 + 0.02 * stufe,
    startGold: 45 * stufe,
    zusatzLeben: Math.floor(stufe / 4),
    wellenBonus: 1 + 0.04 * stufe,
    ausbauKosten: Math.max(0.75, 1 - 0.02 * stufe),
  };
}
