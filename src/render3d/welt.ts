/**
 * Die Welt, wie das Spiel sie sieht.
 *
 * Diese Schicht liest den Zustand der Simulation und spielt deren Ereignisse
 * ab. Sie veraendert nichts daran - genau deshalb kann die Simulation ohne
 * sie laufen, siehe docs/03-architektur.md.
 *
 * Sie traegt ausserdem die Kamera und die Umrechnung zwischen Bildschirm und
 * Karte. Beides gehoert in drei Dimensionen zusammen: wo eine Beruehrung
 * hinfaellt, laesst sich nicht mehr mit einer festen Formel ausrechnen, es
 * haengt davon ab, wo die Kamera steht. Ein Strahl von der Kamera durch den
 * Beruehrungspunkt auf den Boden beantwortet die Frage unabhaengig davon,
 * wie schraeg man gerade schaut.
 */

import * as THREE from 'three';
import type { DamageType, Enemy, LevelDef, SimEvent, World } from '@sim/index';
import { Buehne, STIMMUNG_JE_REGION, STUFEN } from './buehne';
import type { Stufe, StufenName } from './buehne';
import { Effekte3D } from './effekte3d';
import { Anzeige2D } from './anzeige2d';
import { alsGruppe, baueModell, bewege, setzeBauform, VOXEL } from './meshbau';
import type { ModellBau } from './meshbau';
import { setzeVerschmelzung } from './glatt';
import { KNETMODELLE } from './knetmodelle';
import { HOEHE } from './welt3d';

export type Auswahl = { art: 'platz' | 'turm'; index: number } | null;

interface Bild {
  readonly gruppe: THREE.Group;
  readonly teile: THREE.Object3D[];
}

const MIN_ABSTAND = 8;
const MAX_ABSTAND = 70;

/**
 * Modelle entstehen erst, wenn sie gebraucht werden.
 *
 * Alle achtzig auf einmal zu bauen dauert eine Sekunde; eine Karte zeigt
 * aber nur ein Vierteil davon. Der Vorrat bleibt ueber Kartenwechsel hinweg
 * stehen, damit die zweite Partie sofort beginnt.
 */
const gebaut = new Map<string, ModellBau | null>();

function holeModell(id: string): ModellBau | null {
  const vorhanden = gebaut.get(id);
  if (vorhanden !== undefined) return vorhanden;
  const roh = KNETMODELLE.get(id);
  const bau = roh === undefined ? null : baueModell(roh);
  gebaut.set(id, bau);
  return bau;
}

/** Baut vorab, was eine Karte sicher braucht. Verteilt den Ruckler auf das Laden. */
export function baueModelleVor(level: LevelDef, tuerme: readonly string[]): void {
  setzeBauform('glatt');
  setzeVerschmelzung(0.5);
  for (const prop of level.props) holeModell(prop.model);
  for (const id of tuerme) {
    for (let stufe = 0; stufe < 4; stufe++) holeModell(`${id}_s${stufe}`);
  }
}

export class Welt3D {
  readonly leinwand = document.createElement('canvas');
  readonly anzeige = new Anzeige2D();
  private readonly buehne: Buehne;
  private readonly effekte = new Effekte3D();

  private readonly gegnerBilder = new Map<number, Bild>();
  private readonly turmBilder = new Map<number, { bild: Bild; stufe: number; defId: string }>();
  private readonly geschossBilder = new Map<number, Bild>();

  private readonly markierung: THREE.Mesh;
  private readonly reichweitenRing: THREE.Mesh;

  // --- Kamera ---------------------------------------------------------------
  // Fast frontal statt ueber Eck: auf einem quer gehaltenen Telefon liegt
  // die lange Seite der Karte dann quer ueber den Bildschirm, und davon hat
  // man am meisten. Die Vierteldrehung aus dem Prototyp sieht als Schaubild
  // besser aus, verschenkt beim Spielen aber die halbe Breite.
  private drehung = -Math.PI / 2 + 0.22;
  private neigung = 0.7;
  private abstand: number;
  private readonly blick: THREE.Vector3;
  private ruettelRest = 0;
  private ruettelStaerke = 0;
  private breite = 1;
  private hoehe = 1;

  private readonly strahl = new THREE.Raycaster();
  private readonly ebene: THREE.Plane;
  private readonly treffer = new THREE.Vector3();
  private readonly hilfe = new THREE.Vector3();

  constructor(
    private readonly level: LevelDef,
    stimmung = STIMMUNG_JE_REGION[level.region],
  ) {
    setzeBauform('glatt');
    setzeVerschmelzung(0.5);
    this.leinwand.style.position = 'absolute';
    this.leinwand.style.inset = '0';
    this.leinwand.style.touchAction = 'none';

    const modelle = new Map<string, ModellBau>();
    for (const prop of level.props) {
      const bau = holeModell(prop.model);
      if (bau !== null) modelle.set(prop.model, bau);
    }
    this.buehne = new Buehne(this.leinwand, level, modelle, stimmung);
    this.buehne.szene.add(this.effekte.punkte, this.effekte.striche);

    this.blick = new THREE.Vector3(level.breite / 2, 0, level.hoehe / 2);
    this.abstand = Math.max(level.breite, level.hoehe) * 1.35;
    this.ebene = new THREE.Plane(new THREE.Vector3(0, 1, 0), -HOEHE.boden);

    // Der Reichweitenring liegt flach auf dem Boden statt als Ellipse im
    // Bild: in drei Dimensionen ist das die ehrliche Auskunft darueber, was
    // ein Turm erreicht.
    this.reichweitenRing = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.reichweitenRing.visible = false;
    this.reichweitenRing.renderOrder = 4;
    this.buehne.szene.add(this.reichweitenRing);

    this.markierung = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.42, 36).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.markierung.visible = false;
    this.markierung.renderOrder = 4;
    this.buehne.szene.add(this.markierung);

    this.setzeKamera();
  }

  // --- Kamera ---------------------------------------------------------------

  private setzeKamera(): void {
    const k = this.buehne.kamera;
    k.position.set(
      this.blick.x + Math.cos(this.drehung) * Math.cos(this.neigung) * this.abstand,
      this.blick.y + Math.sin(this.neigung) * this.abstand,
      this.blick.z + Math.sin(this.drehung) * Math.cos(this.neigung) * this.abstand,
    );
    if (this.ruettelRest > 0) {
      k.position.x += (Math.random() - 0.5) * this.ruettelStaerke * 0.06;
      k.position.y += (Math.random() - 0.5) * this.ruettelStaerke * 0.06;
    }
    k.lookAt(this.blick);
    // Ohne das bleiben die Matrizen bis zum naechsten Bild alt, und jede
    // Projektion rechnet mit der vorigen Kameraposition. Beim Einpassen
    // faellt das sofort auf: die Messung misst dann eine Kamera, die es so
    // gar nicht mehr gibt.
    k.updateMatrixWorld(true);
  }

  /**
   * Setzt die Kamera so, dass die ganze Karte im Bild ist.
   *
   * Aus Kartenbreite und Blickwinkel eine Entfernung auszurechnen geht
   * schief, sobald die Insel gedreht ist oder der Bildschirm ein anderes
   * Verhaeltnis hat. Deshalb wird hier stattdessen gemessen: die vier Ecken
   * werden aufs Bild geworfen, und die Entfernung so lange nachgezogen, bis
   * sie hineinpassen. Drei Durchgaenge genuegen, weil die Ausdehnung im Bild
   * fast genau umgekehrt proportional zur Entfernung ist.
   *
   * Oben und unten bleibt mehr Rand als an den Seiten: dort sitzen die
   * Leiste mit Gold und Leben und die Taste fuer die naechste Welle.
   */
  passeAn(): void {
    const level = this.level;
    this.blick.set(level.breite / 2, 0, level.hoehe / 2);
    const ecken = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(level.breite, 0, 0),
      new THREE.Vector3(0, 0, level.hoehe),
      new THREE.Vector3(level.breite, 0, level.hoehe),
      // Die hoechsten Koerper stehen darauf und muessen mit ins Bild.
      new THREE.Vector3(level.breite / 2, 3, level.hoehe / 2),
    ];
    for (let runde = 0; runde < 4; runde++) {
      this.setzeKamera();
      let weitesteX = 0.01;
      let weitesteY = 0.01;
      for (const ecke of ecken) {
        this.hilfe.copy(ecke).project(this.buehne.kamera);
        weitesteX = Math.max(weitesteX, Math.abs(this.hilfe.x));
        weitesteY = Math.max(weitesteY, Math.abs(this.hilfe.y));
      }
      const noetig = Math.max(weitesteX / 0.92, weitesteY / 0.78);
      this.abstand = Math.max(MIN_ABSTAND, Math.min(MAX_ABSTAND, this.abstand * noetig));
    }
    this.setzeKamera();
  }

  /** Ein Finger schiebt: die Karte folgt dem Finger, nicht die Kamera. */
  verschiebe(dx: number, dy: number): void {
    const massstab = (this.abstand * 2 * Math.tan((this.buehne.kamera.fov * Math.PI) / 360)) / this.hoehe;
    const vor = new THREE.Vector3(-Math.cos(this.drehung), 0, -Math.sin(this.drehung)).normalize();
    const quer = new THREE.Vector3(-vor.z, 0, vor.x);
    this.blick.addScaledVector(quer, -dx * massstab);
    this.blick.addScaledVector(vor, -dy * massstab);
    this.begrenze();
    this.setzeKamera();
  }

  zoome(faktor: number): void {
    this.abstand = Math.max(MIN_ABSTAND, Math.min(MAX_ABSTAND, this.abstand / faktor));
    this.setzeKamera();
  }

  drehe(um: number, neige = 0): void {
    this.drehung += um;
    this.neigung = Math.max(0.25, Math.min(1.35, this.neigung + neige));
    this.setzeKamera();
  }

  /** Haelt den Blick ueber der Karte, damit man sie nicht verlieren kann. */
  private begrenze(): void {
    const rand = 6;
    this.blick.x = Math.max(-rand, Math.min(this.level.breite + rand, this.blick.x));
    this.blick.z = Math.max(-rand, Math.min(this.level.hoehe + rand, this.blick.z));
  }

  ruettle(staerke: number, dauer = 0.25): void {
    this.ruettelRest = Math.max(this.ruettelRest, dauer);
    this.ruettelStaerke = Math.max(this.ruettelStaerke, staerke);
  }

  aktualisiereKamera(dt: number): void {
    if (this.ruettelRest > 0) {
      this.ruettelRest -= dt;
      if (this.ruettelRest <= 0) this.ruettelStaerke = 0;
      this.setzeKamera();
    }
  }

  setzeGroesse(breite: number, hoehe: number): void {
    this.breite = breite;
    this.hoehe = hoehe;
    this.buehne.setzeGroesse(breite, hoehe);
    this.anzeige.setzeGroesse(breite, hoehe);
    this.setzeKamera();
  }

  setzeStufe(name: StufenName, vonHand = false): void {
    const stufe = STUFEN.find((s) => s.name === name);
    if (stufe === undefined) return;
    this.buehne.setzeStufe(stufe as Stufe);
    if (vonHand) this.regeltSelbst = false;
  }

  get stufenName(): StufenName {
    return this.buehne.stufe.name;
  }

  /** Zeichenbefehle des letzten Bildes. Fuer die Pruefwerkzeuge. */
  letzteBefehle = 0;

  get dreiecke(): number {
    return this.buehne.renderer.info.render.triangles;
  }

  /**
   * Passt die Qualitaetsstufe an das Geraet an.
   *
   * Die Stufe von Hand waehlen zu lassen ist eine Zumutung: niemand weiss
   * vorher, was sein Telefon schafft, und wer es falsch waehlt, spielt ein
   * ruckelndes Spiel und haelt das fuer normal. Also wird gemessen.
   *
   * Heruntergestuft wird schnell und hochgestuft langsam. Der Grund ist
   * nicht Vorsicht, sondern dass ein staendiges Hin und Her schlimmer
   * aussieht als die niedrigere Stufe: jeder Wechsel baut Schatten und
   * Durchgaenge neu auf und kostet selbst ein Bild.
   */
  private regeltSelbst = true;
  private messBeginn = 0;
  private messbilder = 0;
  private hochseitAn = 0;

  /**
   * Gemessen wird die echte Zeit, nicht die Zeit, die das Spiel gerechnet
   * hat. Das Spiel deckelt seinen Zeitschritt bei hundert Millisekunden,
   * damit es bei einem Ruckler nicht endlos nachholt. Wer damit misst,
   * braucht auf einem wirklich langsamen Geraet eine halbe Minute, bis das
   * erste Messfenster voll ist - also genau dort am laengsten, wo es am
   * dringendsten waere.
   */
  beobachteLeistung(): void {
    if (!this.regeltSelbst) return;
    const jetzt = performance.now();
    if (this.messBeginn === 0) {
      this.messBeginn = jetzt;
      return;
    }
    this.messbilder += 1;
    const vergangen = jetzt - this.messBeginn;
    if (vergangen < 1500 && this.messbilder < 90) return;
    const mittel = vergangen / Math.max(1, this.messbilder);
    this.messBeginn = jetzt;
    this.messbilder = 0;

    const rang = STUFEN.findIndex((s) => s.name === this.buehne.stufe.name);
    if (mittel > 22 && rang < STUFEN.length - 1) {
      this.hochseitAn = 0;
      this.buehne.setzeStufe(STUFEN[rang + 1] as Stufe);
      return;
    }
    if (mittel < 11 && rang > 0) {
      this.hochseitAn += 1;
      // Erst nach vier ruhigen Fenstern, also gut sechs Sekunden.
      if (this.hochseitAn >= 4) {
        this.hochseitAn = 0;
        this.buehne.setzeStufe(STUFEN[rang - 1] as Stufe);
      }
      return;
    }
    this.hochseitAn = 0;
  }

  // --- Umrechnung -----------------------------------------------------------

  /** Welche Kachel liegt unter diesem Punkt des Bildschirms? */
  zurKachel(clientX: number, clientY: number, ziel: { x: number; y: number }): void {
    const kasten = this.leinwand.getBoundingClientRect();
    this.strahl.setFromCamera(
      new THREE.Vector2(
        ((clientX - kasten.left) / kasten.width) * 2 - 1,
        -((clientY - kasten.top) / kasten.height) * 2 + 1,
      ),
      this.buehne.kamera,
    );
    if (this.strahl.ray.intersectPlane(this.ebene, this.treffer) === null) {
      ziel.x = -999;
      ziel.y = -999;
      return;
    }
    ziel.x = this.treffer.x;
    ziel.y = this.treffer.z;
  }

  /** Wo auf dem Bildschirm liegt dieser Punkt der Karte? */
  aufBildschirm(
    x: number,
    y: number,
    hoehe: number,
  ): { x: number; y: number; sichtbar: boolean } {
    this.hilfe.set(x, HOEHE.boden + hoehe, y).project(this.buehne.kamera);
    return {
      x: ((this.hilfe.x + 1) / 2) * this.breite,
      y: ((1 - this.hilfe.y) / 2) * this.hoehe,
      sichtbar: this.hilfe.z < 1,
    };
  }

  // --- Die fuenf Aufgaben der Darstellung ------------------------------------

  leere(): void {
    for (const bild of this.gegnerBilder.values()) this.buehne.szene.remove(bild.gruppe);
    for (const eintrag of this.turmBilder.values()) this.buehne.szene.remove(eintrag.bild.gruppe);
    for (const bild of this.geschossBilder.values()) this.buehne.szene.remove(bild.gruppe);
    this.gegnerBilder.clear();
    this.turmBilder.clear();
    this.geschossBilder.clear();
    this.effekte.leere();
    this.anzeige.leere();
  }

  verarbeite(ereignisse: readonly SimEvent[], world: World): void {
    for (const ereignis of ereignisse) {
      switch (ereignis.type) {
        case 'treffer': {
          this.effekte.treffer(
            ereignis.x,
            HOEHE.weg + 0.6,
            ereignis.y,
            ereignis.damageType as DamageType,
            ereignis.abgeprallt,
          );
          break;
        }
        case 'gegner-gestorben': {
          this.effekte.tod(ereignis.x, HOEHE.weg + 0.5, ereignis.y);
          const punkt = this.aufBildschirm(ereignis.x, ereignis.y, 1.2);
          if (punkt.sichtbar) this.anzeige.zahl(punkt.x, punkt.y, `+${ereignis.gold}`, '#e6b84a');
          break;
        }
        case 'kettenblitz':
          this.effekte.blitz(
            ereignis.vonX,
            HOEHE.weg + 0.7,
            ereignis.vonY,
            ereignis.nachX,
            HOEHE.weg + 0.7,
            ereignis.nachY,
          );
          break;
        case 'turm-gestoert':
          this.effekte.stoerung(ereignis.x, HOEHE.boden + 1.4, ereignis.y);
          break;
        case 'gegner-durch': {
          const ziel = world.routes[0]?.points.at(-1);
          if (ziel !== undefined) this.effekte.durchbruch(ziel.x, HOEHE.weg + 0.6, ziel.y);
          break;
        }
        case 'bossphase': {
          const boss = world.enemies.items.find((e) => e.active && e.id === ereignis.enemyId);
          if (boss !== undefined) this.effekte.bossphase(boss.x, HOEHE.weg + 1, boss.y);
          break;
        }
        default:
          break;
      }
    }
  }

  zeichne(world: World, dt: number, zeit: number): number {
    this.aktualisiereGegner(world, zeit);
    this.aktualisiereTuerme(world);
    this.aktualisiereGeschosse(world);
    this.aktualisiereFlecken(world);
    this.effekte.aktualisiere(dt);
    const befehle = this.buehne.rendere(zeit);
    this.letzteBefehle = befehle;
    this.anzeige.zeichne(world, dt, (x, y, h) => this.aufBildschirm(x, y, h));
    return befehle;
  }

  zeigeMarkierung(world: World, auswahl: Auswahl, reichweite: number): void {
    if (auswahl === null) {
      this.markierung.visible = false;
      this.reichweitenRing.visible = false;
      return;
    }
    let x = 0;
    let z = 0;
    if (auswahl.art === 'platz') {
      const slot = world.level.buildSlots[auswahl.index];
      if (slot === undefined) return;
      x = slot.x;
      z = slot.y;
    } else {
      const tower = world.towers.items.find((t) => t.active && t.id === auswahl.index);
      if (tower === undefined) return;
      x = tower.x;
      z = tower.y;
    }
    this.markierung.position.set(x, HOEHE.boden + 0.06, z);
    this.markierung.visible = true;
    if (reichweite > 0) {
      this.reichweitenRing.position.set(x, HOEHE.boden + 0.05, z);
      this.reichweitenRing.scale.setScalar(reichweite);
      this.reichweitenRing.visible = true;
    } else {
      this.reichweitenRing.visible = false;
    }
  }

  zerstoere(): void {
    this.leere();
    this.buehne.zerstoere();
    this.leinwand.remove();
    this.anzeige.leinwand.remove();
  }

  // --- Innerei --------------------------------------------------------------

  private aktualisiereGegner(world: World, zeit: number): void {
    const lebende = new Set<number>();
    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      lebende.add(enemy.id);
      let bild = this.gegnerBilder.get(enemy.id);
      if (bild === undefined) {
        const bau = holeModell(enemy.defId);
        if (bau === null) continue;
        bild = alsGruppe(bau, this.buehne.materialienGegner);
        this.buehne.szene.add(bild.gruppe);
        this.gegnerBilder.set(enemy.id, bild);
      }
      bild.gruppe.position.set(enemy.x, HOEHE.weg, enemy.y);
      // Plus eine halbe Drehung: die Modelle schauen bei null Grad nach +z,
      // die Simulation meint mit null Grad "nach -z".
      bild.gruppe.rotation.y = Math.PI - (enemy.heading * Math.PI) / 180;
      bewege(bild.teile, zeit, 6 * Math.max(0.2, (enemy as Enemy).baseSpeed));
    }
    this.raeumeAb(this.gegnerBilder, lebende);
  }

  private aktualisiereTuerme(world: World): void {
    const lebende = new Set<number>();
    for (const tower of world.towers.items) {
      if (!tower.active) continue;
      lebende.add(tower.id);
      const vorhanden = this.turmBilder.get(tower.id);
      // Beim Ausbauen wechselt das Modell. Deshalb steht die Stufe daneben.
      if (vorhanden !== undefined && vorhanden.stufe !== tower.level) {
        this.buehne.szene.remove(vorhanden.bild.gruppe);
        this.turmBilder.delete(tower.id);
      }
      let eintrag = this.turmBilder.get(tower.id);
      if (eintrag === undefined) {
        const bau = holeModell(`${tower.defId}_s${tower.level}`) ?? holeModell(`${tower.defId}_s0`);
        if (bau === null) continue;
        const bild = alsGruppe(bau, this.buehne.materialien);
        bild.gruppe.position.set(tower.x, HOEHE.boden, tower.y);
        this.buehne.szene.add(bild.gruppe);
        eintrag = { bild, stufe: tower.level, defId: tower.defId };
        this.turmBilder.set(tower.id, eintrag);
      }
      const kopf = eintrag.bild.teile[eintrag.bild.teile.length - 1];
      if (kopf !== undefined) kopf.rotation.y = Math.PI - (tower.heading * Math.PI) / 180;
    }
    for (const [id, eintrag] of this.turmBilder) {
      if (lebende.has(id)) continue;
      this.buehne.szene.remove(eintrag.bild.gruppe);
      this.turmBilder.delete(id);
    }
  }

  private aktualisiereGeschosse(world: World): void {
    const lebende = new Set<number>();
    for (const geschoss of world.projectiles.items) {
      if (!geschoss.active || geschoss.model === '') continue;
      lebende.add(geschoss.id);
      let bild = this.geschossBilder.get(geschoss.id);
      if (bild === undefined) {
        const bau = holeModell(geschoss.model);
        if (bau === null) continue;
        bild = alsGruppe(bau, this.buehne.materialien);
        this.buehne.szene.add(bild.gruppe);
        this.geschossBilder.set(geschoss.id, bild);
      }
      bild.gruppe.position.set(geschoss.x, HOEHE.boden + 0.62, geschoss.y);
      const dx = geschoss.targetX - geschoss.x;
      const dz = geschoss.targetY - geschoss.y;
      if (dx !== 0 || dz !== 0) bild.gruppe.rotation.y = Math.atan2(dx, dz);
    }
    this.raeumeAb(this.geschossBilder, lebende);
  }

  /** Ein weicher Fleck unter allem, was gerade laeuft. */
  private aktualisiereFlecken(world: World): void {
    let n = this.festeFlecken;
    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      this.buehne.bodenschatten.setze(n++, enemy.x, HOEHE.weg + 0.012, enemy.y, 0.75);
    }
    for (const tower of world.towers.items) {
      if (!tower.active) continue;
      this.buehne.bodenschatten.setze(n++, tower.x, HOEHE.boden + 0.012, tower.y, 1.05);
    }
    this.buehne.bodenschatten.zeige(n);
  }

  /** Requisiten stehen fest; ihre Flecken werden einmal gesetzt. */
  private festeFlecken = 0;

  setzeRequisitenFlecken(): void {
    let n = 0;
    for (const prop of this.level.props) {
      const bau = holeModell(prop.model);
      if (bau === null) continue;
      this.buehne.bodenschatten.setze(n++, prop.x, HOEHE.boden + 0.012, prop.y, 0.55 + bau.hoehe * 0.42);
    }
    this.festeFlecken = n;
  }

  /**
   * Nimmt aus der Szene, was es nicht mehr gibt.
   *
   * Die Geometrien werden dabei bewusst nicht freigegeben: sie gehoeren dem
   * Modellvorrat und werden von der naechsten Figur derselben Art sofort
   * wieder gebraucht.
   */
  private raeumeAb(bilder: Map<number, Bild>, lebende: Set<number>): void {
    for (const [id, bild] of bilder) {
      if (lebende.has(id)) continue;
      this.buehne.szene.remove(bild.gruppe);
      bilder.delete(id);
    }
  }
}

export { VOXEL };
