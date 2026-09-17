/**
 * Tests der Progression.
 *
 * Forschung, Meisterschaft, Spielstand und die Herausforderung der Woche.
 * Diese Systeme fallen nicht laut aus, sondern still. Deshalb Tests.
 */

import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/index';
import { FORSCHUNG, FORSCHUNG_NACH_ID, istVerfuegbar } from '@meta/forschung';
import {
  HOECHSTSTUFE,
  SPEZIALISIERUNGEN,
  WAHLSTUFEN,
  erfahrungFuerStufe,
  findeSpezialisierung,
  spezialisierungenFuer,
  stufeAusErfahrung,
} from '@meta/meisterschaft';
import { berechneBoni, loadoutPlaetze, verfuegbareTuerme } from '@meta/boni';
import { migriere, neuerStand } from '@meta/spielstand';
import { herausforderungFuer, wochenNummer } from '@meta/herausforderung';

const content = loadContent();

describe('Forschung', () => {
  it('kennt fuer jeden gesperrten Turm genau einen Knoten', () => {
    for (const turm of content.towers.values()) {
      if (turm.forschung === null) continue;
      const knoten = FORSCHUNG_NACH_ID.get(turm.forschung);
      expect(knoten, `Knoten fuer ${turm.id} fehlt`).toBeDefined();
      expect(knoten?.wirkung.turm).toBe(turm.id);
    }
  });

  it('hat keine unerfuellbaren Voraussetzungen', () => {
    for (const knoten of FORSCHUNG) {
      for (const vorher of knoten.voraussetzung) {
        expect(FORSCHUNG_NACH_ID.has(vorher), `${knoten.id} braucht ${vorher}`).toBe(true);
      }
    }
  });

  it('laesst sich vollstaendig freischalten, ohne stecken zu bleiben', () => {
    const erforscht = new Set<string>();
    for (let runde = 0; runde < FORSCHUNG.length + 1; runde++) {
      for (const knoten of FORSCHUNG) {
        if (!erforscht.has(knoten.id) && istVerfuegbar(knoten.id, erforscht)) {
          erforscht.add(knoten.id);
        }
      }
    }
    expect(erforscht.size).toBe(FORSCHUNG.length);
  });

  it('gibt vier Tuerme ohne Forschung und zwoelf mit voller Forschung', () => {
    const leer = neuerStand();
    expect(verfuegbareTuerme(leer, content)).toHaveLength(4);
    leer.forschung = FORSCHUNG.map((knoten) => knoten.id);
    expect(verfuegbareTuerme(leer, content)).toHaveLength(12);
    expect(loadoutPlaetze(leer)).toBe(5);
  });
});

describe('Meisterschaft', () => {
  it('bietet fuer jeden Turm zwei Wahlmoeglichkeiten je Wahlstufe', () => {
    for (const turmId of content.towers.keys()) {
      for (const stufe of WAHLSTUFEN) {
        expect(spezialisierungenFuer(turmId, stufe), `${turmId} Stufe ${stufe}`).toHaveLength(2);
      }
    }
  });

  it('vergibt eindeutige Kennungen', () => {
    const gesehen = new Set<string>();
    for (const liste of Object.values(SPEZIALISIERUNGEN)) {
      for (const eintrag of liste) {
        expect(gesehen.has(eintrag.id), `doppelt: ${eintrag.id}`).toBe(false);
        gesehen.add(eintrag.id);
        expect(findeSpezialisierung(eintrag.id)).not.toBeNull();
      }
    }
  });

  it('steigt mit der Erfahrung und bleibt bei der Hoechststufe stehen', () => {
    expect(stufeAusErfahrung(0)).toBe(1);
    expect(stufeAusErfahrung(erfahrungFuerStufe(5))).toBe(5);
    expect(stufeAusErfahrung(erfahrungFuerStufe(HOECHSTSTUFE) * 10)).toBe(HOECHSTSTUFE);
  });

  it('wirkt erst, wenn die Stufe erreicht ist', () => {
    const stand = neuerStand();
    stand.meisterschaft['armbrustturm'] = { erfahrung: 0, wahlen: ['armbrust-15b'] };
    const ohne = berechneBoni(stand, content).tuerme.get('armbrustturm');
    expect(ohne?.schaden).toBeCloseTo(1);

    stand.meisterschaft['armbrustturm'] = {
      erfahrung: erfahrungFuerStufe(15),
      wahlen: ['armbrust-15b'],
    };
    const mit = berechneBoni(stand, content).tuerme.get('armbrustturm');
    expect(mit?.schaden ?? 0).toBeGreaterThan(1.5);
  });
});

describe('Spielstand', () => {
  it('ergaenzt fehlende Felder statt abzustuerzen', () => {
    const stand = migriere({ version: 1, splitter: 12 });
    expect(stand.splitter).toBe(12);
    expect(stand.forschung).toEqual([]);
    expect(stand.einstellungen.ton).toBe(true);
  });

  it('macht aus Unsinn einen frischen Stand', () => {
    expect(migriere(null).splitter).toBe(0);
    expect(migriere('kaputt').forschung).toEqual([]);
  });
});

describe('Herausforderung der Woche', () => {
  it('ist fuer dieselbe Woche immer gleich', () => {
    const a = herausforderungFuer(2870, content);
    const b = herausforderungFuer(2870, content);
    expect(b).toEqual(a);
  });

  it('unterscheidet sich von Woche zu Woche', () => {
    const wochen = new Set<string>();
    for (let woche = 2800; woche < 2830; woche++) {
      const h = herausforderungFuer(woche, content);
      wochen.add(`${h.levelId}|${h.difficulty}|${h.mutatorId}|${h.loadout.join(',')}`);
    }
    expect(wochen.size).toBeGreaterThan(20);
  });

  it('gibt immer vier bekannte Tuerme mit mindestens einer Schadensquelle', () => {
    for (let woche = 2800; woche < 2860; woche++) {
      const h = herausforderungFuer(woche, content);
      expect(h.loadout).toHaveLength(4);
      expect(new Set(h.loadout).size).toBe(4);
      for (const id of h.loadout) expect(content.towers.has(id)).toBe(true);
      const schaden = h.loadout.some((id) => (content.towers.get(id)?.damage ?? 0) > 0);
      expect(schaden, `Woche ${woche} ohne Schaden`).toBe(true);
      expect(content.levels.has(h.levelId)).toBe(true);
      expect(content.mutators.has(h.mutatorId)).toBe(true);
    }
  });

  it('wechselt genau einmal je Woche', () => {
    const montag = Date.UTC(2026, 0, 5);
    const sonntag = Date.UTC(2026, 0, 11, 23, 59);
    const naechsterMontag = Date.UTC(2026, 0, 12);
    expect(wochenNummer(sonntag)).toBe(wochenNummer(montag));
    expect(wochenNummer(naechsterMontag)).toBe(wochenNummer(montag) + 1);
  });
});
