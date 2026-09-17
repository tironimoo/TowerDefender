/**
 * Alle Menues und Uebersichten.
 *
 * Jede Funktion baut einen fertigen Dialog und gibt ihn zurueck. Der Aufrufer
 * haengt ihn in die Ueberlagerung. Kein Zustand bleibt hier liegen.
 */

import type { Content, Difficulty, LevelDef, World } from '@sim/index';
import { el, formatiere, fortschritt, leere, sterne, taste } from './bausteine';
import type { Spielstand } from '@meta/spielstand';
import { sterneFuer, sterneGesamt } from '@meta/spielstand';
import { AST_BESCHREIBUNG, AST_NAMEN, FORSCHUNG, istVerfuegbar } from '@meta/forschung';
import type { Ast } from '@meta/forschung';
import {
  HOECHSTSTUFE,
  WAHLSTUFEN,
  erfahrungFuerStufe,
  spezialisierungenFuer,
  stufeAusErfahrung,
  stufenFortschritt,
} from '@meta/meisterschaft';
import { loadoutPlaetze, verfuegbareTuerme } from '@meta/boni';

const REGION_NAME: Readonly<Record<LevelDef['region'], string>> = {
  wald: 'Waldsenke',
  glut: 'Glutschlucht',
  leere: 'Leerlande',
};

const SCHWIERIGKEIT_NAME: Readonly<Record<Difficulty, string>> = {
  normal: 'Normal',
  hart: 'Hart',
  albtraum: 'Albtraum',
};

export function dialog(titel: string, kinder: readonly (Node | string | false)[]): HTMLElement {
  return el('div', { class: 'ueberlagerung' }, [
    el('div', { class: 'tafel dialog' }, [el('h1', {}, [titel]), ...kinder]),
  ]);
}

// --- Level und Schwierigkeit ------------------------------------------------

/** Eine Karte ist offen, wenn die vorherige auf Normal geschafft ist. */
export function levelOffen(stand: Spielstand, content: Content, index: number): boolean {
  if (index === 0) return true;
  const vorher = content.levelReihenfolge[index - 1];
  return vorher !== undefined && sterneFuer(stand, vorher, 'normal') > 0;
}

export function schwierigkeitOffen(
  stand: Spielstand,
  levelId: string,
  difficulty: Difficulty,
): boolean {
  if (difficulty === 'normal') return true;
  if (difficulty === 'hart') return sterneFuer(stand, levelId, 'normal') > 0;
  return sterneFuer(stand, levelId, 'hart') >= 3;
}

export function endlosOffen(stand: Spielstand, content: Content): boolean {
  const letzte = content.levelReihenfolge.at(-1);
  return letzte !== undefined && sterneFuer(stand, letzte, 'normal') > 0;
}

export interface LevelAuswahlRueckrufe {
  readonly beiLevel: (levelId: string, difficulty: Difficulty, endlos: boolean) => void;
  readonly beiZurueck: () => void;
}

export function levelAuswahl(
  stand: Spielstand,
  content: Content,
  rueckrufe: LevelAuswahlRueckrufe,
): HTMLElement {
  const liste = el('div', { class: 'raster' });
  const endlosFrei = endlosOffen(stand, content);

  content.levelReihenfolge.forEach((levelId, index) => {
    const level = content.levels.get(levelId);
    if (level === undefined) return;
    const offen = levelOffen(stand, content, index);

    const grade = el('div', { class: 'reihe' });
    if (offen) {
      for (const grad of ['normal', 'hart', 'albtraum'] as const) {
        const frei = schwierigkeitOffen(stand, levelId, grad);
        const knopf = taste(
          `${SCHWIERIGKEIT_NAME[grad].slice(0, 1)} ${sterne(sterneFuer(stand, levelId, grad))}`,
          () => rueckrufe.beiLevel(levelId, grad, false),
          'klein',
        );
        knopf.disabled = !frei;
        knopf.title = SCHWIERIGKEIT_NAME[grad];
        grade.append(knopf);
      }
      if (endlosFrei) {
        const bestwert = stand.endlos[levelId] ?? 0;
        const knopf = taste(
          bestwert > 0 ? `Endlos · ${bestwert}` : 'Endlos',
          () => rueckrufe.beiLevel(levelId, 'normal', true),
          'klein',
        );
        grade.append(knopf);
      }
    }

    liste.append(
      el('div', { class: `eintrag region-${level.region}`, ...(offen ? {} : { disabled: true }) }, [
        el('span', { class: 'titel' }, [`${index + 1}. ${level.name}`]),
        el('div', { class: 'zeile' }, [
          el('span', {}, [REGION_NAME[level.region]]),
          el('span', {}, [offen ? `${level.waves.length} Wellen` : 'gesperrt']),
        ]),
        offen ? grade : el('div', { class: 'zeile schwach' }, ['Erst die Karte davor schaffen.']),
      ]),
    );
  });

  return dialog('Karten', [
    el('div', { class: 'zeile schwach' }, [
      `${sterneGesamt(stand)} von ${content.levelReihenfolge.length * 9} Sternen`,
    ]),
    liste,
    el('div', { class: 'reihe' }, [taste('Zurueck', rueckrufe.beiZurueck)]),
  ]);
}

// --- Loadout ----------------------------------------------------------------

export interface LoadoutRueckrufe {
  readonly beiStart: (loadout: string[]) => void;
  readonly beiZurueck: () => void;
}

export function loadoutWahl(
  stand: Spielstand,
  content: Content,
  level: LevelDef,
  difficulty: Difficulty,
  endlos: boolean,
  rueckrufe: LoadoutRueckrufe,
): HTMLElement {
  const plaetze = loadoutPlaetze(stand);
  const verfuegbar = verfuegbareTuerme(stand, content);
  const gewaehlt = new Set<string>(
    (stand.loadouts[level.id] ?? []).filter((id) => verfuegbar.includes(id)).slice(0, plaetze),
  );
  if (gewaehlt.size === 0) {
    for (const id of verfuegbar.slice(0, plaetze)) gewaehlt.add(id);
  }

  // Gegner dieser Karte, damit die Wahl eine Entscheidung ist und kein Raten.
  const gegnerIds = new Set<string>();
  for (const welle of level.waves) {
    for (const gruppe of welle.groups) gegnerIds.add(gruppe.enemyId);
  }
  const gegnerListe = el('div', { class: 'raster' });
  for (const id of gegnerIds) {
    const def = content.enemies.get(id);
    if (def === undefined) continue;
    const merkmale: string[] = [`Panzerung ${def.armor}`];
    if (def.flying) merkmale.push('fliegt');
    if (def.invisible) merkmale.push('unsichtbar');
    if (def.immun.length > 0) merkmale.push(`immun gegen ${def.immun.join(', ')}`);
    if (def.boss !== null) merkmale.push('Boss');
    gegnerListe.append(
      el('div', { class: 'eintrag' }, [
        el('span', { class: 'titel' }, [def.name]),
        el('div', { class: 'zeile' }, [el('span', {}, [merkmale.join(' · ')])]),
      ]),
    );
  }

  const turmListe = el('div', { class: 'raster' });
  const startTaste = taste('Losgehen', () => rueckrufe.beiStart([...gewaehlt]), 'stark');

  const zeichneTuerme = (): void => {
    leere(turmListe);
    for (const id of verfuegbar) {
      const def = content.towers.get(id);
      if (def === undefined) continue;
      const aktiv = gewaehlt.has(id);
      const knopf = el(
        'button',
        { class: `eintrag ${aktiv ? 'gewaehlt' : ''}`.trim(), type: 'button' },
        [
          el('span', { class: 'titel' }, [def.name]),
          el('div', { class: 'zeile' }, [
            el('span', {}, [def.damageType]),
            el('span', { class: 'gold' }, [`${def.cost} G`]),
          ]),
          el('div', { class: 'zeile' }, [el('span', {}, [def.beschreibung])]),
        ],
      );
      knopf.addEventListener('click', () => {
        if (gewaehlt.has(id)) gewaehlt.delete(id);
        else if (gewaehlt.size < plaetze) gewaehlt.add(id);
        zeichneTuerme();
      });
      turmListe.append(knopf);
    }
    startTaste.disabled = gewaehlt.size === 0;
    startTaste.textContent = `Losgehen · ${gewaehlt.size}/${plaetze}`;
  };
  zeichneTuerme();

  const titel = endlos ? `${level.name} · Endlos` : `${level.name} · ${SCHWIERIGKEIT_NAME[difficulty]}`;
  const mutator =
    difficulty === 'albtraum' && level.albtraumMutator !== ''
      ? content.mutators.get(level.albtraumMutator)
      : undefined;

  return dialog(titel, [
    mutator !== undefined &&
      el('div', { class: 'eintrag' }, [
        el('span', { class: 'titel' }, [`Mutator: ${mutator.name}`]),
        el('div', { class: 'zeile' }, [el('span', {}, [mutator.beschreibung])]),
      ]),
    el('h2', {}, ['Was dich erwartet']),
    gegnerListe,
    el('h2', {}, [`Loadout · hoechstens ${plaetze} Tuerme`]),
    turmListe,
    el('div', { class: 'reihe' }, [startTaste, taste('Zurueck', rueckrufe.beiZurueck)]),
  ]);
}

// --- Ergebnis ---------------------------------------------------------------

export interface ErgebnisDaten {
  readonly world: World;
  readonly level: LevelDef;
  readonly difficulty: Difficulty;
  readonly endlos: boolean;
  readonly sterne: number;
  readonly splitter: number;
  readonly erfahrung: ReadonlyMap<string, number>;
  readonly stufenAufstiege: readonly string[];
  readonly neuerBestwert: boolean;
}

export interface ErgebnisRueckrufe {
  readonly beiNochmal: () => void;
  readonly beiWeiter: (() => void) | null;
  readonly beiMenue: () => void;
}

export function ergebnis(
  daten: ErgebnisDaten,
  content: Content,
  rueckrufe: ErgebnisRueckrufe,
): HTMLElement {
  const gewonnen = daten.world.status === 'gewonnen';
  const titel = daten.endlos
    ? `Welle ${daten.world.wavesCleared} erreicht`
    : gewonnen
      ? 'Geschafft'
      : 'Durchgebrochen';

  const erfahrungsListe = el('div', { class: 'raster' });
  for (const [turmId, menge] of daten.erfahrung) {
    const def = content.towers.get(turmId);
    if (def === undefined || menge <= 0) continue;
    erfahrungsListe.append(
      el('div', { class: 'eintrag' }, [
        el('span', { class: 'titel' }, [def.name]),
        el('div', { class: 'zeile' }, [
          el('span', {}, ['Erfahrung']),
          el('span', { class: 'akzent' }, [`+${formatiere(menge)}`]),
        ]),
      ]),
    );
  }

  return dialog(titel, [
    el('div', { class: 'reihe' }, [
      !daten.endlos && el('span', { class: 'sterne' }, [sterne(daten.sterne)]),
      el('span', { class: 'schwach' }, [
        `${daten.world.lives} Leben · ${daten.world.wavesCleared} Wellen · ${formatiere(daten.world.stats.killed)} erledigt`,
      ]),
    ]),
    daten.neuerBestwert && el('div', { class: 'zeile akzent' }, ['Neuer Bestwert.']),
    daten.splitter > 0 &&
      el('div', { class: 'reihe' }, [
        el('span', {}, ['Splitter']),
        el('span', { class: 'gold zahl' }, [`+${daten.splitter}`]),
      ]),
    daten.stufenAufstiege.length > 0 &&
      el('div', { class: 'eintrag' }, [
        el('span', { class: 'titel' }, ['Stufenaufstieg']),
        el('div', { class: 'zeile' }, [el('span', {}, [daten.stufenAufstiege.join(', ')])]),
      ]),
    erfahrungsListe.childElementCount > 0 && el('h2', {}, ['Meisterschaft']),
    erfahrungsListe.childElementCount > 0 && erfahrungsListe,
    el('div', { class: 'reihe' }, [
      rueckrufe.beiWeiter !== null && taste('Weiter', rueckrufe.beiWeiter, 'stark'),
      taste('Nochmal', rueckrufe.beiNochmal),
      taste('Karten', rueckrufe.beiMenue),
    ]),
  ]);
}

// --- Forschung --------------------------------------------------------------

export interface ForschungRueckrufe {
  readonly beiKaufen: (id: string) => void;
  readonly beiZuruecksetzen: () => void;
  readonly beiZurueck: () => void;
}

export function forschungsBaum(
  stand: Spielstand,
  content: Content,
  rueckrufe: ForschungRueckrufe,
): HTMLElement {
  const erforscht = new Set(stand.forschung);
  const abschnitte: HTMLElement[] = [];

  for (const ast of ['arsenal', 'handwerk', 'kommando'] as Ast[]) {
    const liste = el('div', { class: 'raster' });
    for (const knoten of FORSCHUNG.filter((eintrag) => eintrag.ast === ast)) {
      const gekauft = erforscht.has(knoten.id);
      const verfuegbar = istVerfuegbar(knoten.id, erforscht);
      const bezahlbar = stand.splitter >= knoten.kosten;

      const knopf = el(
        'button',
        {
          class: `eintrag ${gekauft ? 'gewaehlt' : ''}`.trim(),
          type: 'button',
          disabled: gekauft || !verfuegbar || !bezahlbar,
        },
        [
          el('span', { class: 'titel' }, [knoten.name]),
          el('div', { class: 'zeile' }, [el('span', {}, [knoten.beschreibung])]),
          el('div', { class: 'zeile' }, [
            el('span', {}, [
              gekauft ? 'erforscht' : verfuegbar ? 'verfuegbar' : 'Voraussetzung fehlt',
            ]),
            el('span', { class: 'gold' }, [gekauft ? '' : `${knoten.kosten} Splitter`]),
          ]),
        ],
      );
      if (!gekauft && verfuegbar && bezahlbar) {
        knopf.addEventListener('click', () => rueckrufe.beiKaufen(knoten.id));
      }
      liste.append(knopf);
    }
    abschnitte.push(
      el('h2', {}, [`${AST_NAMEN[ast]} · ${AST_BESCHREIBUNG[ast]}`]),
      liste,
    );
  }

  const zuruecksetzen = taste('Umverteilen', rueckrufe.beiZuruecksetzen, 'klein');
  zuruecksetzen.disabled = stand.forschung.length === 0;
  zuruecksetzen.title = 'Gibt drei Viertel der Splitter zurueck.';

  return dialog('Forschung', [
    el('div', { class: 'reihe' }, [
      el('span', {}, ['Splitter']),
      el('span', { class: 'gold zahl' }, [formatiere(stand.splitter)]),
      el('span', { class: 'schwach' }, [
        `${stand.forschung.length} von ${FORSCHUNG.length} Knoten`,
      ]),
      el('span', { class: 'schwach' }, [`${verfuegbareTuerme(stand, content).length} Tuerme frei`]),
    ]),
    ...abschnitte,
    el('div', { class: 'reihe' }, [taste('Zurueck', rueckrufe.beiZurueck), zuruecksetzen]),
  ]);
}

// --- Meisterschaft ----------------------------------------------------------

export interface MeisterschaftRueckrufe {
  readonly beiWahl: (turmId: string, spezialisierungId: string) => void;
  readonly beiZurueck: () => void;
}

export function meisterschaftUebersicht(
  stand: Spielstand,
  content: Content,
  rueckrufe: MeisterschaftRueckrufe,
): HTMLElement {
  const liste = el('div', {});

  for (const [turmId, def] of content.towers) {
    const eintrag = stand.meisterschaft[turmId];
    const erfahrung = eintrag?.erfahrung ?? 0;
    if (erfahrung <= 0) continue;
    const stufe = stufeAusErfahrung(erfahrung);
    const wahlen = new Set(eintrag?.wahlen ?? []);

    const wahlBloecke: HTMLElement[] = [];
    for (const wahlstufe of WAHLSTUFEN) {
      const optionen = spezialisierungenFuer(turmId, wahlstufe);
      if (optionen.length === 0) continue;
      const offen = stufe >= wahlstufe;
      const reihe = el('div', { class: 'reihe' });
      for (const option of optionen) {
        const gewaehlt = wahlen.has(option.id);
        const knopf = taste(
          option.name,
          () => rueckrufe.beiWahl(turmId, option.id),
          `klein ${gewaehlt ? 'aktiv' : ''}`.trim(),
        );
        knopf.disabled = !offen;
        knopf.title = option.beschreibung;
        reihe.append(knopf);
      }
      wahlBloecke.push(
        el('div', { class: 'zeile schwach' }, [
          `Stufe ${wahlstufe}${offen ? '' : ' · noch gesperrt'}`,
        ]),
        reihe,
      );
      const aktiv = optionen.find((option) => wahlen.has(option.id));
      if (aktiv !== undefined) {
        wahlBloecke.push(el('div', { class: 'zeile' }, [aktiv.beschreibung]));
      }
    }

    liste.append(
      el('div', { class: 'eintrag' }, [
        el('div', { class: 'zeile' }, [
          el('span', { class: 'titel' }, [def.name]),
          el('span', { class: 'akzent' }, [`Stufe ${stufe} von ${HOECHSTSTUFE}`]),
        ]),
        fortschritt(stufenFortschritt(erfahrung)),
        el('div', { class: 'zeile' }, [
          el('span', {}, [`${formatiere(erfahrung)} Erfahrung`]),
          el('span', {}, [
            stufe >= HOECHSTSTUFE
              ? 'Hoechststufe'
              : `naechste bei ${formatiere(erfahrungFuerStufe(stufe + 1))}`,
          ]),
        ]),
        ...wahlBloecke,
      ]),
    );
  }

  if (liste.childElementCount === 0) {
    liste.append(
      el('div', { class: 'zeile schwach' }, [
        'Noch keine Erfahrung. Tuerme sammeln sie, sobald sie Schaden anrichten.',
      ]),
    );
  }

  return dialog('Meisterschaft', [liste, el('div', { class: 'reihe' }, [taste('Zurueck', rueckrufe.beiZurueck)])]);
}

// --- Einstellungen ----------------------------------------------------------

export interface EinstellungRueckrufe {
  readonly beiUmschalten: (feld: 'ton' | 'musik' | 'vibration') => void;
  readonly beiLoeschen: () => void;
  readonly beiZurueck: () => void;
}

export function einstellungen(stand: Spielstand, rueckrufe: EinstellungRueckrufe): HTMLElement {
  const schalter = (marke: string, feld: 'ton' | 'musik' | 'vibration'): HTMLElement =>
    el('div', { class: 'reihe' }, [
      el('span', {}, [marke]),
      taste(
        stand.einstellungen[feld] ? 'an' : 'aus',
        () => rueckrufe.beiUmschalten(feld),
        `klein ${stand.einstellungen[feld] ? 'aktiv' : ''}`.trim(),
      ),
    ]);

  return dialog('Einstellungen', [
    schalter('Geraeusche', 'ton'),
    schalter('Musik', 'musik'),
    schalter('Vibration', 'vibration'),
    el('h2', {}, ['Spielstand']),
    el('div', { class: 'zeile schwach' }, [
      'Loeschen setzt Sterne, Forschung und Meisterschaft zurueck. Das laesst sich nicht rueckgaengig machen.',
    ]),
    el('div', { class: 'reihe' }, [
      taste('Spielstand loeschen', rueckrufe.beiLoeschen, 'gefahr'),
      taste('Zurueck', rueckrufe.beiZurueck),
    ]),
  ]);
}

// --- Hauptmenue -------------------------------------------------------------

export interface HauptmenueRueckrufe {
  readonly beiSpielen: () => void;
  readonly beiForschung: () => void;
  readonly beiMeisterschaft: () => void;
  readonly beiEinstellungen: () => void;
}

export function hauptmenue(
  stand: Spielstand,
  content: Content,
  rueckrufe: HauptmenueRueckrufe,
): HTMLElement {
  const geschafft = content.levelReihenfolge.filter(
    (id) => sterneFuer(stand, id, 'normal') > 0,
  ).length;

  return dialog('TowerDefender', [
    el('div', { class: 'zeile schwach' }, [
      `${geschafft} von ${content.levelReihenfolge.length} Karten · ${sterneGesamt(stand)} Sterne · ${formatiere(stand.splitter)} Splitter`,
    ]),
    el('div', { class: 'reihe' }, [
      taste('Spielen', rueckrufe.beiSpielen, 'stark'),
      taste('Forschung', rueckrufe.beiForschung),
      taste('Meisterschaft', rueckrufe.beiMeisterschaft),
      taste('Einstellungen', rueckrufe.beiEinstellungen),
    ]),
  ]);
}

/** Pausenmenue waehrend einer Partie. */
export function pause(rueckrufe: {
  readonly beiWeiter: () => void;
  readonly beiNeustart: () => void;
  readonly beiAufgeben: () => void;
}): HTMLElement {
  return dialog('Pause', [
    el('div', { class: 'reihe' }, [
      taste('Weiter', rueckrufe.beiWeiter, 'stark'),
      taste('Neu starten', rueckrufe.beiNeustart),
      taste('Aufgeben', rueckrufe.beiAufgeben, 'gefahr'),
    ]),
  ]);
}
