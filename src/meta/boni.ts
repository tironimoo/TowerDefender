/**
 * Berechnung der dauerhaften Boni aus dem Spielstand.
 *
 * Forschung und Meisterschaft sind Daten. Hier werden sie zu den Werten
 * zusammengefuehrt, mit denen die Simulation rechnet. Die Simulation selbst
 * weiss nichts von Forschung oder Erfahrung.
 */

import type { Boni, Content, TurmBonus } from '@sim/index';
import { KEIN_TURM_BONUS, KEINE_BONI } from '@sim/index';
import { FORSCHUNG_NACH_ID } from './forschung';
import { findeSpezialisierung, passiverBonus, stufeAusErfahrung } from './meisterschaft';
import type { Spielstand } from './spielstand';

function verbinde(basis: TurmBonus, teil: Partial<TurmBonus>): TurmBonus {
  return {
    schadenPlus: basis.schadenPlus + (teil.schadenPlus ?? 0),
    schaden: basis.schaden * (teil.schaden ?? 1),
    reichweite: basis.reichweite * (teil.reichweite ?? 1),
    feuerrate: basis.feuerrate * (teil.feuerrate ?? 1),
    splash: basis.splash + (teil.splash ?? 0),
    durchschlag: Math.max(0, Math.min(1, basis.durchschlag + (teil.durchschlag ?? 0))),
    verlangsamung: basis.verlangsamung + (teil.verlangsamung ?? 0),
    brandDps: basis.brandDps + (teil.brandDps ?? 0),
    kettenSpruenge: Math.max(0, basis.kettenSpruenge + (teil.kettenSpruenge ?? 0)),
    auraStaerke: basis.auraStaerke * (teil.auraStaerke ?? 1),
  };
}

export function berechneBoni(stand: Spielstand, content: Content): Boni {
  let schaden = 1;
  let reichweite = 1;
  let ausbauKosten = 1;
  let startGold = 0;
  let zusatzLeben = 0;
  let verkaufswert = KEINE_BONI.verkaufswert;
  let wellenBonus = 1;

  for (const id of stand.forschung) {
    const knoten = FORSCHUNG_NACH_ID.get(id);
    if (knoten === undefined) continue;
    const wirkung = knoten.wirkung;
    schaden += wirkung.schaden ?? 0;
    reichweite += wirkung.reichweite ?? 0;
    ausbauKosten += wirkung.ausbauKosten ?? 0;
    startGold += wirkung.startGold ?? 0;
    zusatzLeben += wirkung.zusatzLeben ?? 0;
    verkaufswert += wirkung.verkaufswert ?? 0;
    wellenBonus += wirkung.wellenBonus ?? 0;
  }

  const tuerme = new Map<string, TurmBonus>();
  for (const turmId of content.towers.keys()) {
    const meisterschaft = stand.meisterschaft[turmId];
    if (meisterschaft === undefined) continue;
    const stufe = stufeAusErfahrung(meisterschaft.erfahrung);
    let bonus = verbinde(KEIN_TURM_BONUS, passiverBonus(stufe));
    for (const wahl of meisterschaft.wahlen) {
      const spezialisierung = findeSpezialisierung(wahl);
      // Nur Wahlen zaehlen, deren Stufe wirklich erreicht ist.
      if (spezialisierung === null || spezialisierung.stufe > stufe) continue;
      bonus = verbinde(bonus, spezialisierung.wirkung);
    }
    tuerme.set(turmId, bonus);
  }

  return {
    tuerme,
    globalerSchaden: schaden,
    globaleReichweite: reichweite,
    ausbauKosten: Math.max(0.4, ausbauKosten),
    startGold,
    zusatzLeben,
    verkaufswert: Math.min(1, verkaufswert),
    wellenBonus,
  };
}

/** Tuerme, die der Spieler ins Loadout nehmen darf. */
export function verfuegbareTuerme(stand: Spielstand, content: Content): string[] {
  const erforscht = new Set(stand.forschung);
  const out: string[] = [];
  for (const [id, def] of content.towers) {
    if (def.forschung === null || erforscht.has(def.forschung)) out.push(id);
  }
  return out;
}

/** Wie viele Tuerme ins Loadout passen. */
export function loadoutPlaetze(stand: Spielstand): number {
  let plaetze = 4;
  for (const id of stand.forschung) {
    plaetze += FORSCHUNG_NACH_ID.get(id)?.wirkung.loadoutPlatz ?? 0;
  }
  return plaetze;
}

/** Splitter, die eine abgeschlossene Karte einbringt. */
export function splitterFuerAbschluss(
  vorherigeSterne: number,
  neueSterne: number,
  erstesMal: boolean,
): number {
  const ausSternen = Math.max(0, neueSterne - vorherigeSterne) * 4;
  return (erstesMal ? 12 : 0) + ausSternen;
}
