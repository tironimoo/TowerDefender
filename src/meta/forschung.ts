/**
 * Forschungsbaum.
 *
 * Drei Aeste, rund vierzig Knoten. Waehrung sind Splitter. Knoten haben
 * Voraussetzungen, aber keine Sackgassen: ein Anfaenger soll sich nichts
 * dauerhaft verbauen koennen. Umverteilen kostet Splitter, ist aber immer
 * moeglich.
 *
 * Siehe docs/02-progression.md.
 */

export type Ast = 'arsenal' | 'handwerk' | 'kommando';

export interface ForschungsWirkung {
  /** Schaltet diesen Turm frei. */
  readonly turm?: string;
  /** Zuschlaege, additiv auf den Grundwert eins beziehungsweise null. */
  readonly schaden?: number;
  readonly reichweite?: number;
  readonly ausbauKosten?: number;
  readonly startGold?: number;
  readonly zusatzLeben?: number;
  readonly verkaufswert?: number;
  readonly wellenBonus?: number;
  /** Zusaetzlicher Platz im Loadout. */
  readonly loadoutPlatz?: number;
}

export interface ForschungsKnoten {
  readonly id: string;
  readonly name: string;
  readonly beschreibung: string;
  readonly ast: Ast;
  readonly kosten: number;
  readonly voraussetzung: readonly string[];
  readonly wirkung: ForschungsWirkung;
}

export const AST_NAMEN: Readonly<Record<Ast, string>> = {
  arsenal: 'Arsenal',
  handwerk: 'Handwerk',
  kommando: 'Kommando',
};

export const AST_BESCHREIBUNG: Readonly<Record<Ast, string>> = {
  arsenal: 'Schaltet die acht zusaetzlichen Tuerme frei.',
  handwerk: 'Verbessert alles, was mit Bauen und Gold zu tun hat.',
  kommando: 'Aendert die Regeln der Partie selbst.',
};

function knoten(
  id: string,
  ast: Ast,
  name: string,
  beschreibung: string,
  kosten: number,
  voraussetzung: readonly string[],
  wirkung: ForschungsWirkung,
): ForschungsKnoten {
  return { id, ast, name, beschreibung, kosten, voraussetzung, wirkung };
}

export const FORSCHUNG: readonly ForschungsKnoten[] = [
  // --- Arsenal: die acht zusaetzlichen Tuerme ------------------------------
  knoten('arsenal-spaehturm', 'arsenal', 'Spaehturm', 'Deckt unsichtbare Gegner auf und erhoeht die Reichweite der Nachbarn.', 25, [], { turm: 'spaehturm' }),
  knoten('arsenal-ambossfalle', 'arsenal', 'Ambossfalle', 'Eine Falle auf dem Weg. Schlaegt hart zu und laedt lange.', 35, [], { turm: 'ambossfalle' }),
  knoten('arsenal-balliste', 'arsenal', 'Balliste', 'Sehr grosse Reichweite, durchschlaegt die halbe Panzerung.', 55, ['arsenal-spaehturm'], { turm: 'balliste' }),
  knoten('arsenal-kolbenstoss', 'arsenal', 'Kolbenstoss', 'Schiebt Gegner auf dem Weg zurueck und schenkt dir Zeit.', 55, ['arsenal-ambossfalle'], { turm: 'kolbenstoss' }),
  knoten('arsenal-blitzspule', 'arsenal', 'Blitzspule', 'Arkaner Blitz, der auf weitere Ziele springt. Unverzichtbar in den Leerlanden.', 80, ['arsenal-balliste'], { turm: 'blitzspule' }),
  knoten('arsenal-netzwerfer', 'arsenal', 'Netzwerfer', 'Haelt ein einzelnes Ziel vollstaendig fest.', 80, ['arsenal-kolbenstoss'], { turm: 'netzwerfer' }),
  knoten('arsenal-leuchtfeuer', 'arsenal', 'Leuchtfeuer', 'Verstaerkt alle benachbarten Tuerme.', 110, ['arsenal-blitzspule'], { turm: 'leuchtfeuer' }),
  knoten('arsenal-alchemie', 'arsenal', 'Alchemieturm', 'Bricht die Panzerung der Gegner im Umkreis.', 110, ['arsenal-netzwerfer'], { turm: 'alchemieturm' }),

  // --- Handwerk: Bauen und Gold -------------------------------------------
  knoten('handwerk-schaden-1', 'handwerk', 'Geschliffen I', 'Alle Tuerme richten fuenf Prozent mehr Schaden an.', 20, [], { schaden: 0.05 }),
  knoten('handwerk-schaden-2', 'handwerk', 'Geschliffen II', 'Noch einmal sechs Prozent mehr Schaden.', 45, ['handwerk-schaden-1'], { schaden: 0.06 }),
  knoten('handwerk-schaden-3', 'handwerk', 'Geschliffen III', 'Noch einmal sieben Prozent mehr Schaden.', 90, ['handwerk-schaden-2'], { schaden: 0.07 }),
  knoten('handwerk-reichweite-1', 'handwerk', 'Weitblick I', 'Vier Prozent mehr Reichweite fuer alle Tuerme.', 25, [], { reichweite: 0.04 }),
  knoten('handwerk-reichweite-2', 'handwerk', 'Weitblick II', 'Noch einmal fuenf Prozent mehr Reichweite.', 60, ['handwerk-reichweite-1'], { reichweite: 0.05 }),
  knoten('handwerk-ausbau-1', 'handwerk', 'Sparsam I', 'Ausbauten kosten sechs Prozent weniger.', 30, [], { ausbauKosten: -0.06 }),
  knoten('handwerk-ausbau-2', 'handwerk', 'Sparsam II', 'Ausbauten kosten noch einmal sieben Prozent weniger.', 65, ['handwerk-ausbau-1'], { ausbauKosten: -0.07 }),
  knoten('handwerk-ausbau-3', 'handwerk', 'Sparsam III', 'Ausbauten kosten noch einmal acht Prozent weniger.', 120, ['handwerk-ausbau-2'], { ausbauKosten: -0.08 }),
  knoten('handwerk-gold-1', 'handwerk', 'Ruecklage I', 'Vierzig Gold mehr zu Beginn jeder Karte.', 25, [], { startGold: 40 }),
  knoten('handwerk-gold-2', 'handwerk', 'Ruecklage II', 'Noch einmal sechzig Gold mehr zu Beginn.', 55, ['handwerk-gold-1'], { startGold: 60 }),
  knoten('handwerk-gold-3', 'handwerk', 'Ruecklage III', 'Noch einmal neunzig Gold mehr zu Beginn.', 100, ['handwerk-gold-2'], { startGold: 90 }),
  knoten('handwerk-verkauf-1', 'handwerk', 'Wiederverwertung I', 'Verkaufen erstattet fuenf Prozent mehr.', 30, [], { verkaufswert: 0.05 }),
  knoten('handwerk-verkauf-2', 'handwerk', 'Wiederverwertung II', 'Verkaufen erstattet noch einmal zehn Prozent mehr.', 70, ['handwerk-verkauf-1'], { verkaufswert: 0.1 }),

  // --- Kommando: die Regeln selbst ----------------------------------------
  knoten('kommando-leben-1', 'kommando', 'Bollwerk I', 'Zwei Leben mehr auf jeder Karte.', 40, [], { zusatzLeben: 2 }),
  knoten('kommando-leben-2', 'kommando', 'Bollwerk II', 'Noch einmal drei Leben mehr.', 95, ['kommando-leben-1'], { zusatzLeben: 3 }),
  knoten('kommando-leben-3', 'kommando', 'Bollwerk III', 'Noch einmal fuenf Leben mehr.', 180, ['kommando-leben-2'], { zusatzLeben: 5 }),
  knoten('kommando-welle-1', 'kommando', 'Drangsal I', 'Fuenfzehn Prozent mehr Bonus fuer vorzeitigen Wellenstart.', 45, [], { wellenBonus: 0.15 }),
  knoten('kommando-welle-2', 'kommando', 'Drangsal II', 'Noch einmal fuenfundzwanzig Prozent mehr Wellenbonus.', 100, ['kommando-welle-1'], { wellenBonus: 0.25 }),
  knoten('kommando-welle-3', 'kommando', 'Drangsal III', 'Noch einmal vierzig Prozent mehr Wellenbonus.', 190, ['kommando-welle-2'], { wellenBonus: 0.4 }),
  knoten('kommando-loadout', 'kommando', 'Fuenfter Platz', 'Ein fuenfter Turm im Loadout. Der teuerste Knoten im Spiel, und der lohnendste.', 320, ['kommando-leben-2', 'kommando-welle-2'], { loadoutPlatz: 1 }),
];

export const FORSCHUNG_NACH_ID: ReadonlyMap<string, ForschungsKnoten> = new Map(
  FORSCHUNG.map((eintrag) => [eintrag.id, eintrag]),
);

/** Gesamtkosten des ganzen Baums. Nur fuer die Anzeige. */
export function gesamtKosten(): number {
  return FORSCHUNG.reduce((summe, eintrag) => summe + eintrag.kosten, 0);
}

export function istVerfuegbar(id: string, erforscht: ReadonlySet<string>): boolean {
  const eintrag = FORSCHUNG_NACH_ID.get(id);
  if (eintrag === undefined) return false;
  return eintrag.voraussetzung.every((vorher) => erforscht.has(vorher));
}
