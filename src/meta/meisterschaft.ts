/**
 * Turm-Meisterschaft.
 *
 * Jeder Turm sammelt eigene Erfahrung, und zwar nur, wenn er tatsaechlich
 * Schaden verursacht oder Wirkung entfaltet. Auf drei Stufen steht eine echte
 * Wahl zwischen zwei Spezialisierungen. Viele davon haben einen Nachteil, und
 * das ist Absicht: sie sollen Aufbauten erzeugen, ueber die man nachdenkt,
 * statt nur groesserer Zahlen.
 *
 * Siehe docs/02-progression.md.
 */

import type { TurmBonus } from '@sim/index';

export const HOECHSTSTUFE = 20;
/** Auf diesen Stufen steht eine Wahl an. */
export const WAHLSTUFEN: readonly number[] = [5, 10, 15];

/**
 * Erfahrung, die bis zu einer Stufe insgesamt noetig ist.
 *
 * Die Kurve ist bewusst steil. Die erste Wahl auf Stufe fuenf kommt nach
 * wenigen Partien, die Hoechststufe erst nach vielen. Sonst waere die
 * Meisterschaft nach einem Abend erledigt.
 */
export function erfahrungFuerStufe(stufe: number): number {
  if (stufe <= 1) return 0;
  return Math.round(900 * Math.pow(stufe, 2.5));
}

export function stufeAusErfahrung(erfahrung: number): number {
  let stufe = 1;
  while (stufe < HOECHSTSTUFE && erfahrung >= erfahrungFuerStufe(stufe + 1)) stufe += 1;
  return stufe;
}

/** Fortschritt innerhalb der aktuellen Stufe, null bis eins. */
export function stufenFortschritt(erfahrung: number): number {
  const stufe = stufeAusErfahrung(erfahrung);
  if (stufe >= HOECHSTSTUFE) return 1;
  const unten = erfahrungFuerStufe(stufe);
  const oben = erfahrungFuerStufe(stufe + 1);
  return Math.max(0, Math.min(1, (erfahrung - unten) / (oben - unten)));
}

export interface Spezialisierung {
  readonly id: string;
  readonly name: string;
  readonly beschreibung: string;
  readonly stufe: number;
  readonly wirkung: Partial<TurmBonus>;
}

/**
 * Kleine passive Verbesserung je Stufe, unabhaengig von den Wahlen.
 * Ein Prozent Schaden je Stufe. Ueber zwanzig Stufen ein Fuenftel mehr.
 */
export function passiverBonus(stufe: number): Partial<TurmBonus> {
  return { schaden: 1 + 0.01 * (stufe - 1) };
}

function spez(
  id: string,
  stufe: number,
  name: string,
  beschreibung: string,
  wirkung: Partial<TurmBonus>,
): Spezialisierung {
  return { id, stufe, name, beschreibung, wirkung };
}

/** Alle Spezialisierungen je Turm, sechs Stueck: zwei je Wahlstufe. */
export const SPEZIALISIERUNGEN: Readonly<Record<string, readonly Spezialisierung[]>> = {
  armbrustturm: [
    spez('armbrust-5a', 5, 'Gespannte Sehne', 'Ein Viertel schneller, dafuer etwas kuerzere Reichweite.', { feuerrate: 1.25, reichweite: 0.92 }),
    spez('armbrust-5b', 5, 'Langer Schaft', 'Ein Fuenftel mehr Reichweite, dafuer langsamer.', { reichweite: 1.2, feuerrate: 0.9 }),
    spez('armbrust-10a', 10, 'Panzerbrecher', 'Durchschlaegt ein Viertel der Panzerung zusaetzlich.', { durchschlag: 0.25 }),
    spez('armbrust-10b', 10, 'Doppelbolzen', 'Deutlich mehr Schaden je Schuss, dafuer traeger.', { schaden: 1.3, feuerrate: 0.85 }),
    spez('armbrust-15a', 15, 'Dauerfeuer', 'Fast doppelte Feuerrate, dafuer schwaechere Schuesse.', { feuerrate: 1.45, schaden: 0.8 }),
    spez('armbrust-15b', 15, 'Scharfschuetze', 'Sehr harte, seltene Schuesse auf grosse Entfernung.', { schaden: 1.6, feuerrate: 0.75, reichweite: 1.15 }),
  ],
  schleuder: [
    spez('schleuder-5a', 5, 'Weiter Wurf', 'Fast ein Fuenftel mehr Reichweite.', { reichweite: 1.18 }),
    spez('schleuder-5b', 5, 'Schwerer Stein', 'Mehr Schaden, etwas kuerzere Reichweite.', { schaden: 1.2, reichweite: 0.92 }),
    spez('schleuder-10a', 10, 'Splitterladung', 'Der Einschlag trifft einen deutlich groesseren Umkreis.', { splash: 0.5 }),
    spez('schleuder-10b', 10, 'Wuchtgeschoss', 'Viel mehr Schaden auf kleinerer Flaeche.', { schaden: 1.35, splash: -0.2 }),
    spez('schleuder-15a', 15, 'Streufeuer', 'Deutlich schneller, dafuer schwaecher.', { feuerrate: 1.4, schaden: 0.8 }),
    spez('schleuder-15b', 15, 'Bergsturz', 'Sehr grosse Flaeche, dafuer traege.', { splash: 0.9, feuerrate: 0.85 }),
  ],
  frostturm: [
    spez('frost-5a', 5, 'Tiefer Frost', 'Verlangsamt spuerbar staerker.', { verlangsamung: 0.12 }),
    spez('frost-5b', 5, 'Weites Feld', 'Ein Viertel mehr Reichweite.', { reichweite: 1.25 }),
    spez('frost-10a', 10, 'Eisdorn', 'Der Frost richtet fast doppelt so viel arkanen Schaden an.', { schaden: 1.9 }),
    spez('frost-10b', 10, 'Klirrende Kaelte', 'Noch staerkere Verlangsamung auf kleinerem Feld.', { verlangsamung: 0.18, reichweite: 0.9 }),
    spez('frost-15a', 15, 'Frostbrand', 'Wird zur echten Schadensquelle, verlangsamt dafuer weniger.', { schaden: 2.5, verlangsamung: -0.1 }),
    spez('frost-15b', 15, 'Erstarrung', 'Bringt Gegner beinahe zum Stillstand, wirkt aber nur nah.', { verlangsamung: 0.25, reichweite: 0.8 }),
  ],
  glutduese: [
    spez('glut-5a', 5, 'Hoher Druck', 'Ein Fuenftel mehr Reichweite.', { reichweite: 1.2 }),
    spez('glut-5b', 5, 'Heisse Glut', 'Der Brand richtet mehr Schaden an.', { brandDps: 4 }),
    spez('glut-10a', 10, 'Brandsaat', 'Sehr starker Brand, schwaecherer Direktschaden.', { brandDps: 7, schaden: 0.85 }),
    spez('glut-10b', 10, 'Stichflamme', 'Deutlich mehr Direktschaden.', { schaden: 1.3 }),
    spez('glut-15a', 15, 'Feuersturm', 'Erfasst einen weiten Umkreis, trifft dafuer schwaecher.', { splash: 0.8, schaden: 0.8 }),
    spez('glut-15b', 15, 'Weissglut', 'Alles brennt heisser, nur nicht so weit.', { schaden: 1.55, brandDps: 6, reichweite: 0.85 }),
  ],
  balliste: [
    spez('balliste-5a', 5, 'Praezision', 'Noch mehr Reichweite.', { reichweite: 1.15 }),
    spez('balliste-5b', 5, 'Schwerer Bolzen', 'Ein Fuenftel mehr Schaden.', { schaden: 1.2 }),
    spez('balliste-10a', 10, 'Panzerstecher', 'Durchschlaegt fast jede Panzerung.', { durchschlag: 0.3 }),
    spez('balliste-10b', 10, 'Schnellspanner', 'Deutlich schneller, dafuer schwaecher.', { feuerrate: 1.3, schaden: 0.88 }),
    spez('balliste-15a', 15, 'Belagerung', 'Ein einziger, verheerender Schuss.', { schaden: 1.7, feuerrate: 0.8 }),
    spez('balliste-15b', 15, 'Durchschlag', 'Reisst die Panzerung auf und trifft die Umgebung mit.', { durchschlag: 0.45, splash: 0.6 }),
  ],
  blitzspule: [
    spez('blitz-5a', 5, 'Leitfaehig', 'Ein Sprung mehr.', { kettenSpruenge: 1 }),
    spez('blitz-5b', 5, 'Hochspannung', 'Ein Viertel mehr Schaden.', { schaden: 1.25 }),
    spez('blitz-10a', 10, 'Kaskade', 'Zwei Spruenge mehr, dafuer schwaecher.', { kettenSpruenge: 2, schaden: 0.85 }),
    spez('blitz-10b', 10, 'Entladung', 'Mehr Schaden auf kuerzere Entfernung.', { schaden: 1.35, reichweite: 0.9 }),
    spez('blitz-15a', 15, 'Gewitter', 'Drei Spruenge mehr und schneller. Die Antwort auf Schwaerme.', { kettenSpruenge: 3, feuerrate: 1.15 }),
    spez('blitz-15b', 15, 'Einschlag', 'Fast doppelter Schaden, dafuer ein Sprung weniger.', { schaden: 1.8, kettenSpruenge: -1 }),
  ],
  ambossfalle: [
    spez('amboss-5a', 5, 'Schwerer Amboss', 'Ein Viertel mehr Schaden.', { schaden: 1.25 }),
    spez('amboss-5b', 5, 'Schnelle Feder', 'Laedt deutlich schneller nach.', { feuerrate: 1.35 }),
    spez('amboss-10a', 10, 'Breite Platte', 'Trifft einen groesseren Umkreis.', { splash: 0.5 }),
    spez('amboss-10b', 10, 'Gehaertete Kante', 'Durchschlaegt Panzerung deutlich besser.', { durchschlag: 0.3 }),
    spez('amboss-15a', 15, 'Fallgrube', 'Ein vernichtender Schlag mit langer Pause.', { schaden: 1.8, feuerrate: 0.8 }),
    spez('amboss-15b', 15, 'Doppelschlag', 'Schlaegt fast doppelt so oft zu, dafuer schwaecher.', { feuerrate: 1.7, schaden: 0.85 }),
  ],
  netzwerfer: [
    spez('netz-5a', 5, 'Zaehes Netz', 'Deutlich kuerzere Pause zwischen zwei Wuerfen.', { feuerrate: 1.35 }),
    spez('netz-5b', 5, 'Weiter Wurf', 'Ein Viertel mehr Reichweite.', { reichweite: 1.25 }),
    spez('netz-10a', 10, 'Klebenetz', 'Noch schneller, dafuer kuerzere Reichweite.', { feuerrate: 1.5, reichweite: 0.9 }),
    spez('netz-10b', 10, 'Widerhaken', 'Das Netz richtet erstmals Schaden an.', { schadenPlus: 14 }),
    spez('netz-15a', 15, 'Fangnetz', 'Faengt beinahe ununterbrochen, nur nicht weit.', { feuerrate: 1.8, reichweite: 0.85 }),
    spez('netz-15b', 15, 'Dornennetz', 'Ein Netz, das wirklich weh tut.', { schadenPlus: 34, reichweite: 1.2 }),
  ],
  kolbenstoss: [
    spez('kolben-5a', 5, 'Starke Feder', 'Stoesst deutlich haeufiger.', { feuerrate: 1.3 }),
    spez('kolben-5b', 5, 'Breiter Kolben', 'Erfasst mehr Gegner auf einmal.', { splash: 0.4 }),
    spez('kolben-10a', 10, 'Wucht', 'Der Stoss richtet erheblichen Schaden an.', { schaden: 1.8 }),
    spez('kolben-10b', 10, 'Schnellschub', 'Sehr haeufige Stoesse auf engem Raum.', { feuerrate: 1.45, splash: -0.2 }),
    spez('kolben-15a', 15, 'Rammbock', 'Schwer und breit.', { schaden: 2.5, splash: 0.4 }),
    spez('kolben-15b', 15, 'Dauerschub', 'Schiebt fast ohne Pause, dafuer schwach.', { feuerrate: 1.8, schaden: 0.8 }),
  ],
  leuchtfeuer: [
    spez('leucht-5a', 5, 'Weites Licht', 'Ein Fuenftel mehr Reichweite.', { reichweite: 1.2 }),
    spez('leucht-5b', 5, 'Helles Licht', 'Verstaerkt Nachbarn spuerbar mehr.', { auraStaerke: 1.15 }),
    spez('leucht-10a', 10, 'Brennglas', 'Sehr starke Verstaerkung auf kleinem Feld.', { auraStaerke: 1.3, reichweite: 0.9 }),
    spez('leucht-10b', 10, 'Leuchtturm', 'Deckt ein Drittel mehr Flaeche ab.', { reichweite: 1.35 }),
    spez('leucht-15a', 15, 'Sonnenstand', 'Halb so viel Reichweite verschenkt, dafuer die halbe Wirkung dazu.', { auraStaerke: 1.5, reichweite: 0.85 }),
    spez('leucht-15b', 15, 'Weitstrahler', 'Reicht ueber die halbe Karte.', { reichweite: 1.55, auraStaerke: 1.1 }),
  ],
  alchemieturm: [
    spez('alchemie-5a', 5, 'Scharfe Saeure', 'Bricht Panzerung deutlicher.', { auraStaerke: 1.15 }),
    spez('alchemie-5b', 5, 'Weite Daempfe', 'Ein Fuenftel mehr Reichweite.', { reichweite: 1.2 }),
    spez('alchemie-10a', 10, 'Aetzend', 'Deutlich staerkere Wirkung.', { auraStaerke: 1.3 }),
    spez('alchemie-10b', 10, 'Nebelbank', 'Erfasst ein Drittel mehr Flaeche.', { reichweite: 1.35 }),
    spez('alchemie-15a', 15, 'Zersetzung', 'Loest fast jede Panzerung auf.', { auraStaerke: 1.55, reichweite: 0.9 }),
    spez('alchemie-15b', 15, 'Giftschwaden', 'Wirkt weit und immer noch kraeftig.', { reichweite: 1.5, auraStaerke: 1.12 }),
  ],
  spaehturm: [
    spez('spaeh-5a', 5, 'Fernrohr', 'Ein Viertel mehr Reichweite.', { reichweite: 1.25 }),
    spez('spaeh-5b', 5, 'Klarsicht', 'Verstaerkt die Reichweite der Nachbarn mehr.', { auraStaerke: 1.15 }),
    spez('spaeh-10a', 10, 'Wachturm', 'Deckt ein Drittel mehr Flaeche auf.', { reichweite: 1.35 }),
    spez('spaeh-10b', 10, 'Adlerauge', 'Deutlich staerkere Unterstuetzung.', { auraStaerke: 1.3 }),
    spez('spaeh-15a', 15, 'Rundumblick', 'Sieht ueber die halbe Karte.', { reichweite: 1.55 }),
    spez('spaeh-15b', 15, 'Zielhilfe', 'Macht aus Nachbarn deutlich bessere Schuetzen.', { auraStaerke: 1.55 }),
  ],
};

export function spezialisierungenFuer(turmId: string, stufe: number): readonly Spezialisierung[] {
  return (SPEZIALISIERUNGEN[turmId] ?? []).filter((eintrag) => eintrag.stufe === stufe);
}

export function findeSpezialisierung(id: string): Spezialisierung | null {
  for (const liste of Object.values(SPEZIALISIERUNGEN)) {
    const treffer = liste.find((eintrag) => eintrag.id === id);
    if (treffer !== undefined) return treffer;
  }
  return null;
}
