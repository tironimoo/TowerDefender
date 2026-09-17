/**
 * Wellenplanung.
 *
 * Wellen werden nicht einzeln von Hand geschrieben, sondern aus einem Plan je
 * Level erzeugt. Der Erzeuger ist vollstaendig bestimmt: gleicher Plan ergibt
 * immer dieselben Wellen. Dadurch bleibt das Balancing messbar, und eine
 * Aenderung am Plan ist eine Zeile statt zwanzig.
 */

import type { WaveDef, WaveGroupDef } from '@sim/model/types';
import { createRng } from '@sim/core/rng';

export interface PoolEintrag {
  readonly enemyId: string;
  /** Ab welcher Welle dieser Gegner vorkommen darf. */
  readonly ab: number;
  /** Relative Haeufigkeit. */
  readonly gewicht: number;
  /** Anzahl in der ersten Welle, in der er vorkommt. */
  readonly basis: number;
  /** Wie stark die Anzahl bis zur letzten Welle waechst. */
  readonly wachstum: number;
  /** Sekunden zwischen zwei Gegnern. Null bedeutet: aus dem Tempo abgeleitet. */
  readonly abstand?: number;
}

export interface WellenPlan {
  readonly anzahl: number;
  readonly seed: number;
  readonly pool: readonly PoolEintrag[];
  /** Anzahl der Wege. Gruppen werden reihum darauf verteilt. */
  readonly pfade: number;
  /**
   * Faktor auf alle Mengen.
   *
   * Karten mit mehreren Wegen brauchen weniger Gegner je Welle, weil der
   * Spieler seine Verteidigung auf mehrere Bahnen aufteilen muss.
   */
  readonly mengenFaktor?: number;
  /** Boss der letzten Welle. Leer bedeutet kein Boss. */
  readonly boss: string;
  /** Begleitung des Bosses. */
  readonly bossBegleitung: readonly { readonly enemyId: string; readonly count: number }[];
}

/** Wellenbonus: Grundbetrag plus Zuschlag je vorheriger Welle. */
export function wellenBonus(waveNumber: number): number {
  return 55 + 12 * (waveNumber - 1);
}

export function erzeugeWellen(plan: WellenPlan): WaveDef[] {
  const rng = createRng(plan.seed);
  const wellen: WaveDef[] = [];

  for (let n = 1; n <= plan.anzahl; n++) {
    const letzte = n === plan.anzahl;
    if (letzte && plan.boss !== '') {
      wellen.push(bossWelle(plan, n));
      continue;
    }

    const verfuegbar = plan.pool.filter((eintrag) => eintrag.ab <= n);
    if (verfuegbar.length === 0) {
      wellen.push({ groups: [], reward: wellenBonus(n) });
      continue;
    }

    // Jede fuenfte Welle ist dichter, die letzte am dichtesten. Die beiden
    // Verstaerkungen stapeln sich bewusst nicht, sonst wird die letzte Welle
    // zur Wand statt zur Steigerung.
    const letzteOhneBoss = letzte && plan.boss === '';
    const dichte = letzteOhneBoss ? 1.3 : n % 5 === 0 ? 1.25 : 1;
    const finale = 1;
    const anzahlGruppen = Math.min(verfuegbar.length, 1 + (n >= 3 ? 1 : 0) + (n >= 7 ? 1 : 0));

    const gewaehlt = waehle(verfuegbar, anzahlGruppen, rng);
    const groups: WaveGroupDef[] = gewaehlt.map((eintrag, index) => {
      const fortschritt = (n - eintrag.ab) / Math.max(1, plan.anzahl - eintrag.ab);
      const menge = Math.max(
        1,
        Math.round(
          eintrag.basis *
            (1 + (eintrag.wachstum - 1) * fortschritt) *
            dichte *
            finale *
            (plan.mengenFaktor ?? 1),
        ),
      );
      return {
        enemyId: eintrag.enemyId,
        count: menge,
        spacing: eintrag.abstand ?? 0.8,
        delay: index * 4,
        pathIndex: index % plan.pfade,
      };
    });

    wellen.push({ groups, reward: wellenBonus(n) });
  }

  return wellen;
}

function bossWelle(plan: WellenPlan, n: number): WaveDef {
  const groups: WaveGroupDef[] = [
    { enemyId: plan.boss, count: 1, spacing: 1, delay: 4, pathIndex: 0 },
  ];
  plan.bossBegleitung.forEach((begleitung, index) => {
    groups.push({
      enemyId: begleitung.enemyId,
      count: Math.max(1, Math.round(begleitung.count * (plan.mengenFaktor ?? 1))),
      spacing: 0.7,
      delay: index * 6,
      pathIndex: index % plan.pfade,
    });
  });
  return { groups, reward: wellenBonus(n) * 3 };
}

/** Zieht ohne Zuruecklegen, gewichtet. Vollstaendig bestimmt durch den Zufallswert. */
function waehle(
  eintraege: readonly PoolEintrag[],
  anzahl: number,
  rng: ReturnType<typeof createRng>,
): PoolEintrag[] {
  const rest = [...eintraege];
  const out: PoolEintrag[] = [];
  for (let i = 0; i < anzahl && rest.length > 0; i++) {
    const summe = rest.reduce((wert, eintrag) => wert + eintrag.gewicht, 0);
    let wurf = rng.next() * summe;
    let index = rest.length - 1;
    for (let j = 0; j < rest.length; j++) {
      const eintrag = rest[j];
      if (eintrag === undefined) continue;
      wurf -= eintrag.gewicht;
      if (wurf <= 0) {
        index = j;
        break;
      }
    }
    const gewaehlt = rest[index];
    if (gewaehlt !== undefined) out.push(gewaehlt);
    rest.splice(index, 1);
  }
  // Stabil sortieren, damit die Reihenfolge der Gruppen reproduzierbar ist.
  return out.sort((a, b) => a.enemyId.localeCompare(b.enemyId));
}
