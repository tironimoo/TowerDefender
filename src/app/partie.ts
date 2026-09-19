/**
 * Eine laufende Partie.
 *
 * Bindet Simulation, Darstellung, Kamera, Eingabe und Anzeige zusammen. Die
 * Simulation laeuft mit festem Zeitschritt, die Darstellung so schnell wie das
 * Geraet kann. Siehe docs/03-architektur.md, Abschnitt Zeit.
 */

import type { Application} from 'pixi.js';
import { Container } from 'pixi.js';
import type { Boni, Content, Difficulty, LevelDef, SimEvent, World } from '@sim/index';
import { applyCommand, createWorld, drainEvents, step, TICKS_PER_SECOND } from '@sim/index';
import { atlas } from '@render/atlas';
import { baueKarte, blaetterFuer } from '@render/karte';
import type { KartenBild } from '@render/karte';
import { Szene } from '@render/szene';
import { zuBildschirm, zuKachel } from '@render/projektion';
import { Kamera } from './kamera';
import { Hud } from '@ui/hud';
import { Schweber } from '@ui/schweber';
import { Ansage } from '@ui/ansage';
import { klang } from '@platform/klang';
import { vibriere } from '@platform/haptik';

/** Hoechstens so viele Simulationsschritte werden nachgeholt. */
const MAX_NACHHOLEN = 5;
const SCHRITT_MS = 1000 / TICKS_PER_SECOND;
/** Ab dieser Bewegung in Pixeln gilt eine Beruehrung als Schieben. */
const SCHIEBE_SCHWELLE = 8;

export interface PartieOptionen {
  readonly app: Application;
  readonly content: Content;
  readonly level: LevelDef;
  readonly loadout: readonly string[];
  readonly difficulty: Difficulty;
  readonly boni: Boni;
  readonly seed: number;
  readonly mutatorId: string;
  readonly endlos: boolean;
  /** Ob das Geraet vibrieren darf. */
  readonly vibration: boolean;
  readonly tempo: number;
  readonly beiEnde: (world: World) => void;
  readonly beiMenue: () => void;
  readonly beiTempo: (tempo: number) => void;
}

type Auswahl = { art: 'platz'; index: number } | { art: 'turm'; index: number } | null;

export class Partie {
  readonly world: World;
  readonly hud: Hud;
  private readonly wurzel = new Container();
  private readonly szene = new Szene();
  private readonly schweber: Schweber;
  private readonly ansage = new Ansage();
  private readonly kamera: Kamera;
  private readonly karte: KartenBild;
  private auswahl: Auswahl = null;
  /** Turm, dessen Reichweite gerade vorgezeigt wird. */
  private vorschauTurm: string | null = null;
  private restMs = 0;
  private tempo: number;
  private beendet = false;
  private readonly zeiger = new Map<number, { x: number; y: number }>();
  private startPunkt = { x: 0, y: 0 };
  private geschoben = false;
  private letzterAbstand = 0;
  private readonly hilfsPunkt = { x: 0, y: 0 };

  constructor(private readonly optionen: PartieOptionen) {
    this.tempo = optionen.tempo;
    this.world = createWorld({
      content: optionen.content,
      levelId: optionen.level.id,
      difficulty: optionen.difficulty,
      seed: optionen.seed,
      boni: optionen.boni,
      mutatorId: optionen.mutatorId,
      loadout: optionen.loadout,
      endlos: optionen.endlos,
    });

    this.karte = baueKarte(optionen.level);
    // Der Boden aendert sich nie. Als eine einzige Textur zwischengespeichert
    // wird aus mehreren hundert Zeichenaufrufen je Bild genau einer.
    this.karte.boden.cacheAsTexture(true);
    this.szene.fuegeRequisitenEin(this.karte.requisiten);
    this.wurzel.addChild(this.karte.boden, this.szene.welt, this.szene.ueberlagerung);
    optionen.app.stage.addChild(this.wurzel);

    this.kamera = new Kamera(
      this.wurzel,
      this.karte,
      optionen.app.screen.width,
      optionen.app.screen.height,
    );

    this.hud = new Hud({
      beiWelleStarten: () => this.befehl({ type: 'welle-starten' }),
      beiTempo: (tempo) => {
        this.tempo = tempo;
        this.hud.setzeTempo(tempo);
        optionen.beiTempo(tempo);
      },
      beiMenue: () => optionen.beiMenue(),
    });
    this.hud.setzeTempo(this.tempo);

    this.schweber = new Schweber({
      beiBauen: (slotIndex, towerDefId) => {
        this.befehl({ type: 'bauen', slotIndex, towerDefId });
        klang.bauen();
        this.aktualisiereAuswahl();
      },
      beiAusbauen: (towerId) => {
        this.befehl({ type: 'ausbauen', towerId });
        klang.ausbauen();
        this.aktualisiereAuswahl();
      },
      beiFaehigkeit: (towerId, index) => {
        this.befehl({ type: 'faehigkeit', towerId, index });
        klang.faehigkeit();
        this.aktualisiereAuswahl();
      },
      beiVerkaufen: (towerId) => {
        this.befehl({ type: 'verkaufen', towerId });
        klang.verkaufen();
        this.auswahl = null;
        this.schweber.verbirg();
      },
      beiZiel: (towerId, policy) => {
        this.befehl({ type: 'ziel-setzen', towerId, policy });
        this.aktualisiereAuswahl();
      },
      beiVorschau: (towerDefId) => {
        this.vorschauTurm = towerDefId;
      },
    });
    this.hud.element.append(this.ansage.element, this.schweber.element);

    this.verbindeEingabe(optionen.app);
  }

  /** Laedt alle Sprite-Blaetter, die diese Karte braucht. */
  static async ladeBlaetter(
    content: Content,
    level: LevelDef,
    loadout: readonly string[],
  ): Promise<void> {
    await atlas.lade(blaetterFuer(content, level, loadout));
  }

  /**
   * Bildschirmpositionen aller Bauplaetze.
   * Wird von den Vorschauwerkzeugen genutzt, um verlaesslich zu bauen, statt
   * auf Pixel zu raten. Siehe tools/preview.
   */
  bauplatzPunkte(): { x: number; y: number; belegt: boolean; aufWeg: boolean }[] {
    return this.world.level.buildSlots.map((slot, index) => {
      zuBildschirm(slot.x, slot.y, this.hilfsPunkt);
      const welt = { x: this.hilfsPunkt.x, y: this.hilfsPunkt.y };
      this.kamera.zumBildschirm(welt.x, welt.y, this.hilfsPunkt);
      return {
        x: this.hilfsPunkt.x,
        y: this.hilfsPunkt.y,
        belegt: this.world.occupiedSlots.has(index),
        aufWeg: slot.aufWeg,
      };
    });
  }

  zerstoere(): void {
    this.szene.leere();
    this.wurzel.destroy({ children: true });
    this.hud.element.remove();
  }

  passeGroesseAn(breite: number, hoehe: number): void {
    this.kamera.setzeBildschirm(breite, hoehe);
  }

  private befehl(befehl: Parameters<typeof applyCommand>[1]): void {
    applyCommand(this.world, befehl);
  }

  /**
   * Ein Bild.
   * `dtMs` ist die seit dem letzten Bild vergangene echte Zeit.
   */
  aktualisiere(dtMs: number): void {
    const jetzt = performance.now();

    if (!this.beendet) {
      this.restMs += dtMs * this.tempo;
      let schritte = 0;
      while (this.restMs >= SCHRITT_MS && schritte < MAX_NACHHOLEN * this.tempo) {
        step(this.world);
        this.restMs -= SCHRITT_MS;
        schritte += 1;
      }
      // Bei Ueberlast wird Zeit verworfen statt immer mehr nachzuholen. Sonst
      // wird ein langsames Geraet immer langsamer.
      if (this.restMs > SCHRITT_MS * 12) this.restMs = 0;

      const ereignisse = drainEvents(this.world);
      this.szene.verarbeite(ereignisse, this.world);
      klang.ausEreignissen(ereignisse);
      this.verarbeiteAnsagen(ereignisse);

      if (this.world.status === 'gewonnen' || this.world.status === 'verloren') {
        this.beendet = true;
        this.optionen.beiEnde(this.world);
      }
    }

    this.haltMenueAktuell();
    this.kamera.aktualisiere(dtMs / 1000, this.world.tick);
    this.szene.zeichne(this.world, (dtMs / 1000) * this.tempo);
    this.hud.aktualisiere(this.world, jetzt);
    this.ansage.aktualisiere(this.world, jetzt);
    this.zeigeAuswahl();
  }

  /**
   * Haelt das offene Menue auf Stand.
   *
   * Ohne das bleibt die Ausbautaste gesperrt, bis man das Menue schliesst und
   * wieder oeffnet, obwohl das Gold laengst da ist.
   */
  private haltMenueAktuell(): void {
    if (!this.schweber.istOffen || this.auswahl === null) return;
    if (this.auswahl.art !== 'turm') {
      this.schweber.aktualisiere(this.world, null, null);
      return;
    }
    const tower = this.world.towers.items.find((t) => t.active && t.id === this.auswahl?.index);
    if (tower === undefined) {
      this.auswahl = null;
      this.schweber.verbirg();
      return;
    }
    const def = this.world.content.towers.get(tower.defId) ?? null;
    this.schweber.aktualisiere(this.world, tower, def);
  }

  /** Macht aus Ereignissen Ansagen, Warnungen und Erschuetterungen. */
  private verarbeiteAnsagen(ereignisse: readonly SimEvent[]): void {
    for (const ereignis of ereignisse) {
      switch (ereignis.type) {
        case 'befehl-abgelehnt':
          this.hud.zeigeMeldung(ereignis.grund);
          break;
        case 'welle-gestartet': {
          const zusatz = ereignis.bonus > 0 ? `Bonus ${ereignis.bonus} Gold` : '';
          this.ansage.zeige(`Welle ${ereignis.wave}`, zusatz, 1400);
          break;
        }
        case 'welle-geschafft':
          this.hud.zeigeMeldung(`Welle ${ereignis.wave} abgeraeumt · +${ereignis.reward} Gold`);
          break;
        case 'gegner-durch':
          this.kamera.ruettle(7);
          vibriere('durchbruch', this.optionen.vibration);
          break;
        case 'faehigkeit-gelernt':
          this.hud.zeigeMeldung(`${ereignis.name} · Rang ${ereignis.rang}`);
          break;
        case 'bossphase':
          this.kamera.ruettle(11, 0.45);
          this.ansage.zeige('Der Boss veraendert sich', 'Panzerung und Tempo wechseln', 1600);
          break;
        case 'gewonnen':
          this.ansage.zeige('Geschafft', '', 1200);
          break;
        case 'verloren':
          this.kamera.ruettle(14, 0.6);
          break;
        default:
          break;
      }
    }
  }

  // --- Eingabe -------------------------------------------------------------

  private verbindeEingabe(app: Application): void {
    const flaeche = app.canvas;
    flaeche.style.touchAction = 'none';

    flaeche.addEventListener('pointerdown', (ereignis) => {
      flaeche.setPointerCapture(ereignis.pointerId);
      this.zeiger.set(ereignis.pointerId, { x: ereignis.clientX, y: ereignis.clientY });
      if (this.zeiger.size === 1) {
        this.startPunkt = { x: ereignis.clientX, y: ereignis.clientY };
        this.geschoben = false;
      } else {
        this.letzterAbstand = this.zeigerAbstand();
      }
    });

    flaeche.addEventListener('pointermove', (ereignis) => {
      const vorher = this.zeiger.get(ereignis.pointerId);
      if (vorher === undefined) return;
      const dx = ereignis.clientX - vorher.x;
      const dy = ereignis.clientY - vorher.y;
      this.zeiger.set(ereignis.pointerId, { x: ereignis.clientX, y: ereignis.clientY });

      if (this.zeiger.size >= 2) {
        const abstand = this.zeigerAbstand();
        if (this.letzterAbstand > 0 && abstand > 0) {
          const mitte = this.zeigerMitte();
          this.kamera.zoome(abstand / this.letzterAbstand, mitte.x, mitte.y);
        }
        this.letzterAbstand = abstand;
        this.geschoben = true;
        return;
      }

      const weg = Math.hypot(ereignis.clientX - this.startPunkt.x, ereignis.clientY - this.startPunkt.y);
      if (weg > SCHIEBE_SCHWELLE) this.geschoben = true;
      if (this.geschoben) this.kamera.verschiebe(dx, dy);
    });

    const beenden = (ereignis: PointerEvent): void => {
      const war = this.zeiger.size;
      this.zeiger.delete(ereignis.pointerId);
      if (this.zeiger.size < 2) this.letzterAbstand = 0;
      if (war === 1 && !this.geschoben) this.tippe(ereignis.clientX, ereignis.clientY);
    };
    flaeche.addEventListener('pointerup', beenden);
    flaeche.addEventListener('pointercancel', (ereignis) => {
      this.zeiger.delete(ereignis.pointerId);
      this.letzterAbstand = 0;
    });

    flaeche.addEventListener('wheel', (ereignis) => {
      ereignis.preventDefault();
      this.kamera.zoome(ereignis.deltaY < 0 ? 1.12 : 1 / 1.12, ereignis.clientX, ereignis.clientY);
    });
  }

  private zeigerAbstand(): number {
    const punkte = [...this.zeiger.values()];
    const a = punkte[0];
    const b = punkte[1];
    if (a === undefined || b === undefined) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private zeigerMitte(): { x: number; y: number } {
    const punkte = [...this.zeiger.values()];
    const a = punkte[0];
    const b = punkte[1];
    if (a === undefined || b === undefined) return { x: 0, y: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /** Ein Tippen waehlt den naechsten Turm oder Bauplatz, sonst nichts. */
  private tippe(sx: number, sy: number): void {
    this.kamera.zurWelt(sx, sy, this.hilfsPunkt);
    zuKachel(this.hilfsPunkt.x, this.hilfsPunkt.y, this.hilfsPunkt);
    const tx = this.hilfsPunkt.x;
    const ty = this.hilfsPunkt.y;

    let besterIndex = -1;
    let besteEntfernung = 1.1;
    this.world.level.buildSlots.forEach((slot, index) => {
      const d = Math.hypot(slot.x - tx, slot.y - ty);
      if (d < besteEntfernung) {
        besteEntfernung = d;
        besterIndex = index;
      }
    });

    if (besterIndex < 0) {
      this.auswahl = null;
      this.schweber.verbirg();
      return;
    }

    const towerId = this.world.occupiedSlots.get(besterIndex);
    this.auswahl =
      towerId === undefined
        ? { art: 'platz', index: besterIndex }
        : { art: 'turm', index: towerId };
    klang.tippen();
    this.aktualisiereAuswahl();
  }

  private aktualisiereAuswahl(): void {
    if (this.auswahl === null) {
      this.schweber.verbirg();
      return;
    }
    if (this.auswahl.art === 'platz') {
      this.schweber.zeigeBauplatz(this.world, this.auswahl.index, this.optionen.loadout);
      return;
    }
    const tower = this.world.towers.items.find((t) => t.active && t.id === this.auswahl?.index);
    if (tower === undefined) {
      this.auswahl = null;
      this.schweber.verbirg();
      return;
    }
    const def = this.world.content.towers.get(tower.defId);
    if (def === undefined) return;
    this.schweber.zeigeTurm(this.world, tower, def);
  }

  /** Setzt Ring und Schweber auf die richtige Bildschirmposition. */
  private zeigeAuswahl(): void {
    if (this.auswahl === null) {
      this.szene.zeigeMarkierung(this.world, null, 0);
      return;
    }

    let reichweite = 0;
    let weltX = 0;
    let weltY = 0;

    if (this.auswahl.art === 'platz') {
      const slot = this.world.level.buildSlots[this.auswahl.index];
      if (slot === undefined) return;
      if (this.vorschauTurm !== null) {
        const def = this.world.content.towers.get(this.vorschauTurm);
        if (def !== undefined) {
          const turmBonus = this.world.boni.tuerme.get(def.id);
          reichweite =
            def.range *
            (turmBonus?.reichweite ?? 1) *
            this.world.boni.globaleReichweite *
            (this.world.mutator?.turmReichweite ?? 1);
        }
      }
      zuBildschirm(slot.x, slot.y, this.hilfsPunkt);
      weltX = this.hilfsPunkt.x;
      weltY = this.hilfsPunkt.y;
    } else {
      const tower = this.world.towers.items.find((t) => t.active && t.id === this.auswahl?.index);
      if (tower === undefined) {
        this.auswahl = null;
        this.schweber.verbirg();
        return;
      }
      reichweite = tower.range;
      zuBildschirm(tower.x, tower.y, this.hilfsPunkt);
      weltX = this.hilfsPunkt.x;
      weltY = this.hilfsPunkt.y;
    }

    this.szene.zeigeMarkierung(this.world, this.auswahl, reichweite);
    this.kamera.zumBildschirm(weltX, weltY, this.hilfsPunkt);
    this.schweber.setzePosition(this.hilfsPunkt.x, this.hilfsPunkt.y);
  }
}
