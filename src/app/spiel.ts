/**
 * Das Spiel als Ganzes.
 *
 * Haelt Spielstand, Inhalte und die Anzeige zusammen und schaltet zwischen
 * Menues und laufender Partie um. Die Spielschleife laeuft hier, die feste
 * Schrittweite liegt in partie.ts.
 */

import { Application } from 'pixi.js';
import type { Content, Difficulty, LevelDef, World } from '@sim/index';
import { atlas } from '@render/atlas';
import { loadContent } from '@data/index';
import { Partie } from './partie';
import { berechneBoni, splitterFuerAbschluss } from '@meta/boni';
import { findeSpezialisierung, stufeAusErfahrung } from '@meta/meisterschaft';
import { FORSCHUNG_NACH_ID } from '@meta/forschung';
import type { Spielstand } from '@meta/spielstand';
import {
  lade,
  loesche,
  meisterschaftFuer,
  neuerStand,
  sichere,
  sterneFuer,
} from '@meta/spielstand';
import * as menue from '@ui/menues';
import { el } from '@ui/bausteine';
import { herausforderungFuer, wochenNummer } from '@meta/herausforderung';
import { klang } from '@platform/klang';
import { vibriere } from '@platform/haptik';

type Ansicht =
  | 'hauptmenue'
  | 'levelauswahl'
  | 'loadout'
  | 'partie'
  | 'pause'
  | 'ergebnis'
  | 'forschung'
  | 'meisterschaft'
  | 'einstellungen';

interface Auftrag {
  readonly levelId: string;
  readonly difficulty: Difficulty;
  readonly endlos: boolean;
  /** Mutator. Leer bedeutet: der Schwierigkeitsgrad entscheidet. */
  readonly mutatorId: string;
  /** Feste Zufallsfolge. Null bedeutet: jedes Mal neu. */
  readonly seed: number | null;
  /** Kalenderwoche, wenn es die Herausforderung der Woche ist. */
  readonly woche: number | null;
  loadout: string[];
}

export class Spiel {
  private readonly app = new Application();
  private readonly ueberlagerung = el('div', { id: 'ueberlagerung' });
  private content: Content = loadContent();
  private stand: Spielstand = neuerStand();
  private partie: Partie | null = null;
  private auftrag: Auftrag | null = null;
  private ansicht: Ansicht = 'hauptmenue';
  private letzteZeit = 0;

  async starte(wurzel: HTMLElement, uiWurzel: HTMLElement): Promise<void> {
    await this.app.init({
      background: '#0b0e14',
      resizeTo: window,
      antialias: false,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      preference: 'webgl',
    });
    wurzel.appendChild(this.app.canvas);
    uiWurzel.appendChild(this.ueberlagerung);

    await atlas.ladeIndex();
    await atlas.lade(['welt']);
    this.stand = await lade();
    klang.setzeEinstellungen(this.stand.einstellungen.ton, this.stand.einstellungen.musik);

    // Ton darf erst nach einer Beruehrung entstehen.
    const wecken = (): void => {
      klang.wecke();
      klang.setzeEinstellungen(this.stand.einstellungen.ton, this.stand.einstellungen.musik);
      window.removeEventListener('pointerdown', wecken);
    };
    window.addEventListener('pointerdown', wecken);

    window.addEventListener('resize', () => {
      this.partie?.passeGroesseAn(this.app.screen.width, this.app.screen.height);
    });

    // Kleiner Zugang fuer die Vorschauwerkzeuge in tools/preview. Er liest
    // nur, veraendert nichts und stoert das Spiel nicht.
    (window as unknown as Record<string, unknown>)['__td'] = {
      bauplaetze: () => this.partie?.bauplatzPunkte() ?? [],
      zustand: () => ({
        ansicht: this.ansicht,
        gold: this.partie?.world.gold ?? 0,
        leben: this.partie?.world.lives ?? 0,
        welle: this.partie?.world.wavesStarted ?? 0,
        abgeraeumt: this.partie?.world.wavesCleared ?? 0,
        gegner: this.partie?.world.enemies.activeCount ?? 0,
        boss: this.bossAufDerKarte(),
        status: this.partie?.world.status ?? 'kein',
      }),
    };

    this.zeigeHauptmenue();

    this.letzteZeit = performance.now();
    this.app.ticker.add(() => {
      const jetzt = performance.now();
      const dt = Math.min(100, jetzt - this.letzteZeit);
      this.letzteZeit = jetzt;
      if (this.ansicht === 'partie') this.partie?.aktualisiere(dt);
    });
  }

  // --- Ansichten -----------------------------------------------------------

  private setzeUeberlagerung(inhalt: HTMLElement | null): void {
    this.ueberlagerung.replaceChildren();
    if (inhalt !== null) this.ueberlagerung.appendChild(inhalt);
  }

  private zeigeHauptmenue(): void {
    this.ansicht = 'hauptmenue';
    this.beendePartie();
    this.setzeUeberlagerung(
      menue.hauptmenue(this.stand, this.content, herausforderungFuer(wochenNummer(Date.now()), this.content), {
        beiSpielen: () => this.zeigeLevelAuswahl(),
        beiForschung: () => this.zeigeForschung(),
        beiMeisterschaft: () => this.zeigeMeisterschaft(),
        beiEinstellungen: () => this.zeigeEinstellungen(),
        beiHerausforderung: () => this.starteHerausforderung(),
      }),
    );
  }

  /** Startet die Herausforderung der Woche mit festem Loadout und Mutator. */
  private starteHerausforderung(): void {
    const woche = wochenNummer(Date.now());
    const h = herausforderungFuer(woche, this.content);
    this.auftrag = {
      levelId: h.levelId,
      difficulty: h.difficulty,
      endlos: true,
      mutatorId: h.mutatorId,
      seed: h.seed,
      woche,
      loadout: [...h.loadout],
    };
    void this.starteLevel();
  }

  private zeigeLevelAuswahl(): void {
    this.ansicht = 'levelauswahl';
    this.beendePartie();
    this.setzeUeberlagerung(
      menue.levelAuswahl(this.stand, this.content, {
        beiLevel: (levelId, difficulty, endlos) => this.zeigeLoadout(levelId, difficulty, endlos),
        beiZurueck: () => this.zeigeHauptmenue(),
      }),
    );
  }

  private zeigeLoadout(levelId: string, difficulty: Difficulty, endlos: boolean): void {
    const level = this.content.levels.get(levelId);
    if (level === undefined) return;
    this.ansicht = 'loadout';
    this.auftrag = {
      levelId,
      difficulty,
      endlos,
      mutatorId: '',
      seed: null,
      woche: null,
      loadout: [],
    };

    this.setzeUeberlagerung(
      menue.loadoutWahl(this.stand, this.content, level, difficulty, endlos, {
        beiStart: (loadout) => {
          if (this.auftrag === null) return;
          this.auftrag.loadout = loadout;
          this.stand.loadouts[levelId] = loadout;
          void sichere(this.stand);
          void this.starteLevel();
        },
        beiZurueck: () => this.zeigeLevelAuswahl(),
      }),
    );
  }

  private async starteLevel(): Promise<void> {
    const auftrag = this.auftrag;
    if (auftrag === null) return;
    const level = this.content.levels.get(auftrag.levelId);
    if (level === undefined) return;

    this.setzeUeberlagerung(menue.dialog('Wird geladen', []));
    await Partie.ladeBlaetter(this.content, level, auftrag.loadout);

    this.beendePartie();
    const partie = new Partie({
      app: this.app,
      content: this.content,
      level,
      loadout: auftrag.loadout,
      difficulty: auftrag.difficulty,
      boni: berechneBoni(this.stand, this.content),
      seed: auftrag.seed ?? Math.floor(Math.random() * 0xffffffff),
      mutatorId: auftrag.mutatorId,
      endlos: auftrag.endlos,
      vibration: this.stand.einstellungen.vibration,
      tempo: this.stand.einstellungen.tempo,
      beiEnde: (world) => this.zeigeErgebnis(world, level),
      beiMenue: () => this.zeigePause(),
      beiTempo: (tempo) => {
        this.stand.einstellungen.tempo = tempo;
        void sichere(this.stand);
      },
    });
    this.partie = partie;
    document.body.appendChild(partie.hud.element);
    this.setzeUeberlagerung(null);
    this.ansicht = 'partie';
    this.setzeRegionFarbe(level.region);
    klang.starteMusik(level.region);
  }

  private zeigePause(): void {
    if (this.partie === null) return;
    this.ansicht = 'pause';
    this.setzeUeberlagerung(
      menue.pause({
        beiWeiter: () => {
          this.ansicht = 'partie';
          this.setzeUeberlagerung(null);
        },
        beiNeustart: () => void this.starteLevel(),
        beiAufgeben: () => this.zeigeLevelAuswahl(),
      }),
    );
  }

  private zeigeErgebnis(world: World, level: LevelDef): void {
    const auftrag = this.auftrag;
    if (auftrag === null) return;
    this.ansicht = 'ergebnis';
    klang.stoppeMusik();
    vibriere(
      world.status === 'gewonnen' ? 'erfolg' : 'fehlschlag',
      this.stand.einstellungen.vibration,
    );

    const sterneJetzt = this.berechneSterne(world);
    const vorher = sterneFuer(this.stand, level.id, auftrag.difficulty);
    const erstesMal = vorher === 0 && sterneJetzt > 0;
    const splitter = auftrag.endlos
      ? Math.floor(world.wavesCleared / 3)
      : splitterFuerAbschluss(vorher, sterneJetzt, erstesMal);

    // Erfahrung fuer die Tuerme, die tatsaechlich gewirkt haben.
    const erfahrung = new Map<string, number>();
    const aufstiege: string[] = [];
    for (const [turmId, schaden] of world.stats.damageByTower) {
      if (schaden <= 0) continue;
      const menge = Math.round(schaden);
      erfahrung.set(turmId, menge);
      const eintrag = meisterschaftFuer(this.stand, turmId);
      const vorherStufe = stufeAusErfahrung(eintrag.erfahrung);
      eintrag.erfahrung += menge;
      const nachherStufe = stufeAusErfahrung(eintrag.erfahrung);
      if (nachherStufe > vorherStufe) {
        const def = this.content.towers.get(turmId);
        aufstiege.push(`${def?.name ?? turmId} auf ${nachherStufe}`);
      }
    }

    let neuerBestwert = false;
    if (auftrag.woche !== null) {
      const schluessel = String(auftrag.woche);
      const bisher = this.stand.wochen[schluessel] ?? 0;
      if (world.wavesCleared > bisher) {
        this.stand.wochen[schluessel] = world.wavesCleared;
        neuerBestwert = true;
      }
    } else if (auftrag.endlos) {
      const bisher = this.stand.endlos[level.id] ?? 0;
      if (world.wavesCleared > bisher) {
        this.stand.endlos[level.id] = world.wavesCleared;
        neuerBestwert = true;
      }
    } else if (sterneJetzt > vorher) {
      const je = this.stand.sterne[level.id] ?? {};
      je[auftrag.difficulty] = sterneJetzt;
      this.stand.sterne[level.id] = je;
    }

    this.stand.splitter += splitter;
    void sichere(this.stand);

    const index = this.content.levelReihenfolge.indexOf(level.id);
    const naechste = this.content.levelReihenfolge[index + 1];
    const weiterMoeglich =
      !auftrag.endlos && world.status === 'gewonnen' && naechste !== undefined;

    this.setzeUeberlagerung(
      menue.ergebnis(
        {
          world,
          level,
          difficulty: auftrag.difficulty,
          endlos: auftrag.endlos,
          sterne: sterneJetzt,
          splitter,
          erfahrung,
          stufenAufstiege: aufstiege,
          neuerBestwert,
        },
        this.content,
        {
          beiNochmal: () => void this.starteLevel(),
          beiWeiter: weiterMoeglich
            ? () => this.zeigeLoadout(naechste, auftrag.difficulty, false)
            : null,
          beiMenue: () => this.zeigeLevelAuswahl(),
        },
      ),
    );
  }

  /** Drei Sterne bei vollen Leben, zwei ab drei Vierteln, sonst einer. */
  private berechneSterne(world: World): number {
    if (world.status !== 'gewonnen') return 0;
    if (world.lives >= world.startLives) return 3;
    if (world.lives >= Math.ceil(world.startLives * 0.75)) return 2;
    return 1;
  }

  private zeigeForschung(): void {
    this.ansicht = 'forschung';
    this.setzeUeberlagerung(
      menue.forschungsBaum(this.stand, this.content, {
        beiKaufen: (id) => {
          const knoten = FORSCHUNG_NACH_ID.get(id);
          if (knoten === undefined || this.stand.splitter < knoten.kosten) return;
          if (this.stand.forschung.includes(id)) return;
          this.stand.splitter -= knoten.kosten;
          this.stand.ausgegeben += knoten.kosten;
          this.stand.forschung.push(id);
          void sichere(this.stand);
          this.zeigeForschung();
        },
        beiZuruecksetzen: () => {
          // Umverteilen kostet ein Viertel. Niemand soll sich verbauen koennen.
          const zurueck = Math.floor(this.stand.ausgegeben * 0.75);
          this.stand.forschung = [];
          this.stand.splitter += zurueck;
          this.stand.ausgegeben = 0;
          void sichere(this.stand);
          this.zeigeForschung();
        },
        beiZurueck: () => this.zeigeHauptmenue(),
      }),
    );
  }

  private zeigeMeisterschaft(): void {
    this.ansicht = 'meisterschaft';
    this.setzeUeberlagerung(
      menue.meisterschaftUebersicht(this.stand, this.content, {
        beiWahl: (turmId, spezialisierungId) => {
          const spezialisierung = findeSpezialisierung(spezialisierungId);
          if (spezialisierung === null) return;
          const eintrag = meisterschaftFuer(this.stand, turmId);
          if (stufeAusErfahrung(eintrag.erfahrung) < spezialisierung.stufe) return;
          // Je Wahlstufe gilt genau eine Entscheidung.
          eintrag.wahlen = eintrag.wahlen.filter((id) => {
            const andere = findeSpezialisierung(id);
            return andere !== null && andere.stufe !== spezialisierung.stufe;
          });
          eintrag.wahlen.push(spezialisierungId);
          void sichere(this.stand);
          this.zeigeMeisterschaft();
        },
        beiZurueck: () => this.zeigeHauptmenue(),
      }),
    );
  }

  private zeigeEinstellungen(): void {
    this.ansicht = 'einstellungen';
    this.setzeUeberlagerung(
      menue.einstellungen(this.stand, {
        beiUmschalten: (feld) => {
          this.stand.einstellungen[feld] = !this.stand.einstellungen[feld];
          klang.setzeEinstellungen(this.stand.einstellungen.ton, this.stand.einstellungen.musik);
          void sichere(this.stand);
          this.zeigeEinstellungen();
        },
        beiLoeschen: () => {
          void loesche().then(() => {
            this.stand = neuerStand();
            this.zeigeHauptmenue();
          });
        },
        beiZurueck: () => this.zeigeHauptmenue(),
      }),
    );
  }

  /** Ob gerade ein Boss unterwegs ist. Nur fuer die Vorschauwerkzeuge. */
  private bossAufDerKarte(): boolean {
    const world = this.partie?.world;
    if (world === undefined) return false;
    for (const gegner of world.enemies.items) {
      if (!gegner.active) continue;
      const def = world.content.enemies.get(gegner.defId);
      if (def !== undefined && def.boss !== null) return true;
    }
    return false;
  }

  /** Faerbt den Hintergrund passend zur Region. */
  private setzeRegionFarbe(region: LevelDef['region'] | null): void {
    document.body.classList.remove('im-wald', 'im-glut', 'im-leere');
    if (region !== null) document.body.classList.add(`im-${region}`);
  }

  private beendePartie(): void {
    this.setzeRegionFarbe(null);
    if (this.partie === null) return;
    klang.stoppeMusik();
    this.partie.zerstoere();
    this.partie = null;
  }
}
