/**
 * Die Buehne: Renderer, Licht, Nachbearbeitung, Stimmungen, Qualitaetsstufen.
 *
 * Alles, was ein Bild ausmacht und nichts mit dem Spielstand zu tun hat,
 * steht hier. Der Prototyp dreht daran mit Reglern, das Spiel benutzt
 * dieselbe Buehne mit festen Werten - und genau deshalb ist das, was im
 * Prototyp eingestellt wird, auch das, was im Spiel herauskommt. Zwei
 * getrennte Aufbauten waeren zwei Aufbauten, die auseinanderlaufen.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import type { LevelDef, Region } from '@sim/index';
import { AbzugShader } from './abzug';
import { TiltShiftShader } from './tiltshift';
import { knetWerte, machKnete } from './knete';
import { baueHimmel } from './himmel';
import type { Himmel } from './himmel';
import { baueBodenschatten } from './bodenschatten';
import type { Bodenschatten } from './bodenschatten';
import { baueInsel, HOEHE, REGIONEN } from './welt3d';
import type { InselTeile } from './welt3d';
import type { ModellBau } from './meshbau';

export type StufenName = 'Hoch' | 'Mittel' | 'Sparsam';

export interface Stufe {
  readonly name: StufenName;
  readonly schatten: number;
  readonly bluehen: boolean;
  readonly tiltShift: boolean;
  readonly kanten: boolean;
  readonly aufloesung: number;
  readonly lack: number;
  readonly korn: number;
  readonly tiefesWasser: boolean;
  readonly lichter: number;
}

/**
 * Die drei Stufen liegen bewusst weit auseinander.
 *
 * Unterschieden sie sich nur in Schattenaufloesung und Bildpunkten, sieht man
 * auf einem Telefon gar nichts davon. Jetzt faellt bei jeder Stufe etwas weg,
 * das sich benennen laesst.
 */
export const STUFEN: readonly Stufe[] = [
  {
    name: 'Hoch',
    schatten: 2048,
    bluehen: true,
    tiltShift: true,
    kanten: true,
    aufloesung: 2,
    lack: 1,
    korn: 1,
    tiefesWasser: true,
    lichter: 6,
  },
  {
    name: 'Mittel',
    schatten: 1024,
    bluehen: true,
    tiltShift: false,
    kanten: false,
    aufloesung: 1.35,
    lack: 0.35,
    korn: 0.5,
    tiefesWasser: false,
    lichter: 3,
  },
  {
    name: 'Sparsam',
    schatten: 0,
    bluehen: false,
    tiltShift: false,
    kanten: false,
    aufloesung: 1,
    lack: 0,
    korn: 0,
    tiefesWasser: false,
    lichter: 0,
  },
];

/** Was ein Mensch einstellt. Die Stufe daempft es, siehe wendeAn. */
export interface Grundwerte {
  belichtung: number;
  sonne: number;
  gegenlicht: number;
  himmelslicht: number;
  sonnenrichtung: number;
  sonnenhoehe: number;
  fackeln: number;
  kehlen: number;
  bodenschatten: number;
  dunst: number;
  lack: number;
  rauheit: number;
  korn: number;
  beulen: number;
  randlicht: number;
  bluehen: number;
  unschaerfe: number;
  schaerfeband: number;
  koernung: number;
  abschattung: number;
  saettigung: number;
  toenung: number;
}

export interface Stimmung {
  readonly name: string;
  readonly werte: Partial<Grundwerte>;
  /** Farben, die kein Regler ist. */
  readonly farben: {
    readonly himmelOben: string;
    readonly himmelUnten: string;
    readonly schimmer: string;
    readonly nebel: string;
    readonly sonne: string;
    readonly gegen: string;
    readonly himmel: string;
    readonly boden: string;
    readonly saum: string;
  };
}

/**
 * Die Stimmungen.
 *
 * Jede ist eine Behauptung darueber, wie das Spiel aussehen koennte.
 * "Werkbank" ist die, die das Spiel benutzt: hell genug, dass ein Kind auf
 * einem Telefon im Zug alles erkennt, und warm genug, dass es nach
 * Knetwerkstatt aussieht statt nach Bildschirm.
 */
export const STIMMUNGEN: readonly Stimmung[] = [
  {
    name: 'Werkbank',
    farben: {
      himmelOben: '#6d89a8',
      himmelUnten: '#c2a883',
      schimmer: '#e8d5b4',
      nebel: '#93a6a8',
      sonne: '#fff2dc',
      gegen: '#9dc4ee',
      himmel: '#cfe2f5',
      boden: '#8a7256',
      saum: '#ff9e6a',
    },
    werte: {
      belichtung: 1.05, sonne: 3.0, gegenlicht: 1.5, himmelslicht: 2.9,
      sonnenrichtung: 2.35, sonnenhoehe: 0.78,
      fackeln: 1.5, kehlen: 1.0, bodenschatten: 0.62, dunst: 0.004,
      lack: 0.35, rauheit: 0.62, korn: 0.5, beulen: 0.4, randlicht: 0.3,
      bluehen: 0.12, unschaerfe: 13, schaerfeband: 0.16, koernung: 0.05,
      abschattung: 0.3, saettigung: 0.94, toenung: 0.22,
    },
  },
  {
    name: 'Abendsonne',
    farben: {
      himmelOben: '#28407e',
      himmelUnten: '#7a4a3a',
      schimmer: '#ff9e52',
      nebel: '#5a4048',
      sonne: '#ffcb92',
      gegen: '#6f92e0',
      himmel: '#b4bce0',
      boden: '#6a4636',
      saum: '#ff8a52',
    },
    werte: {
      belichtung: 1.25, sonne: 5.6, gegenlicht: 2.0, himmelslicht: 3.6,
      sonnenrichtung: 0.65, sonnenhoehe: 0.4,
      fackeln: 5.0, kehlen: 0.95, bodenschatten: 0.5, dunst: 0.005,
      lack: 0.38, rauheit: 0.6, korn: 0.6, beulen: 0.45, randlicht: 0.5,
      bluehen: 0.3, unschaerfe: 15, schaerfeband: 0.16, koernung: 0.05,
      abschattung: 0.42, saettigung: 1.02, toenung: 0.34,
    },
  },
  {
    name: 'Nachtlager',
    farben: {
      himmelOben: '#060a12',
      himmelUnten: '#101c28',
      schimmer: '#33506b',
      nebel: '#0a1118',
      sonne: '#ffd9a8',
      gegen: '#4e7ab4',
      himmel: '#3c5c80',
      boden: '#141c26',
      saum: '#ffb070',
    },
    werte: {
      belichtung: 1.75, sonne: 2.6, gegenlicht: 2.8, himmelslicht: 3.8,
      sonnenrichtung: 2.1, sonnenhoehe: 0.95,
      fackeln: 13.0, kehlen: 0.8, bodenschatten: 0.5, dunst: 0.005,
      lack: 0.4, rauheit: 0.58, korn: 0.5, beulen: 0.4, randlicht: 0.6,
      bluehen: 0.7, unschaerfe: 12, schaerfeband: 0.16, koernung: 0.06,
      abschattung: 0.38, saettigung: 1.02, toenung: 0.3,
    },
  },
  {
    name: 'Schaukasten',
    farben: {
      himmelOben: '#141c26',
      himmelUnten: '#232d38',
      schimmer: '#6b8096',
      nebel: '#1a222c',
      sonne: '#ffffff',
      gegen: '#cfe4ff',
      himmel: '#dce8f4',
      boden: '#39424c',
      saum: '#ffd2b0',
    },
    werte: {
      belichtung: 1.0, sonne: 2.8, gegenlicht: 2.0, himmelslicht: 2.6,
      sonnenrichtung: 2.6, sonnenhoehe: 1.1,
      fackeln: 0, kehlen: 1.25, bodenschatten: 0.7, dunst: 0.002,
      lack: 0.6, rauheit: 0.42, korn: 0.8, beulen: 0.6, randlicht: 0.22,
      bluehen: 0.1, unschaerfe: 18, schaerfeband: 0.16, koernung: 0.035,
      abschattung: 0.38, saettigung: 0.9, toenung: 0.08,
    },
  },
];

/**
 * Zwei Stimmungen eigens fuers Spiel.
 *
 * Die vier oben sind Vorfuehrstuecke; sie duerfen kraeftig sein. Im Spiel
 * gilt eine andere Regel: der Hintergrund darf die Insel nicht ueberstimmen,
 * und der Weg muss auf jeder Karte zu sehen sein. Deshalb liegt hier hinter
 * der Glut kein Abendhimmel, sondern eine dunkle Schmiedewand - warm
 * beleuchtet, aber ruhig.
 */
const SPIELSTIMMUNGEN: readonly Stimmung[] = [
  {
    name: 'Schmiede',
    farben: {
      himmelOben: '#1d1512',
      himmelUnten: '#2e211b',
      schimmer: '#6b4432',
      nebel: '#241a15',
      sonne: '#ffd9a8',
      gegen: '#8aa8d8',
      himmel: '#c9b8a4',
      boden: '#4a3228',
      saum: '#ff9a52',
    },
    werte: {
      belichtung: 1.15, sonne: 3.4, gegenlicht: 2.0, himmelslicht: 3.0,
      sonnenrichtung: 0.7, sonnenhoehe: 0.62,
      fackeln: 4.0, kehlen: 0.95, bodenschatten: 0.5, dunst: 0.004,
      lack: 0.38, rauheit: 0.6, korn: 0.55, beulen: 0.42, randlicht: 0.42,
      bluehen: 0.28, unschaerfe: 13, schaerfeband: 0.16, koernung: 0.05,
      abschattung: 0.34, saettigung: 0.96, toenung: 0.18,
    },
  },
  {
    name: 'Sternwarte',
    farben: {
      himmelOben: '#0d0b18',
      himmelUnten: '#1a1730',
      schimmer: '#4a4078',
      nebel: '#151228',
      sonne: '#e8e4ff',
      gegen: '#8fb4ff',
      himmel: '#bcc4e8',
      boden: '#2a2444',
      saum: '#c9a8ff',
    },
    werte: {
      belichtung: 1.1, sonne: 3.2, gegenlicht: 2.2, himmelslicht: 3.2,
      sonnenrichtung: 2.5, sonnenhoehe: 0.85,
      fackeln: 3.0, kehlen: 1.0, bodenschatten: 0.55, dunst: 0.004,
      lack: 0.45, rauheit: 0.55, korn: 0.6, beulen: 0.45, randlicht: 0.4,
      bluehen: 0.32, unschaerfe: 14, schaerfeband: 0.16, koernung: 0.05,
      abschattung: 0.34, saettigung: 0.95, toenung: 0.16,
    },
  },
];

/**
 * Welche Stimmung zu welcher Region gehoert.
 *
 * Nicht aus Geschmack, sondern aus Lesbarkeit: die Glutregion ist von sich
 * aus dunkel, und mit dem gedaempften Werkbanklicht verschwindet der Weg
 * darin. Das Abendlicht traegt die Waerme der Lava mit und macht die Karte
 * gleichzeitig hell genug, dass ein Kind auf einem Telefon im Zug sieht, wo
 * die Gegner laufen. Fuer die Leere gilt dasselbe mit kaltem Licht.
 */
export const STIMMUNG_JE_REGION: Readonly<Record<Region, string>> = {
  wald: 'Werkbank',
  glut: 'Schmiede',
  leere: 'Sternwarte',
};

function stimmungNach(name: string): Stimmung {
  const alle = [...STIMMUNGEN, ...SPIELSTIMMUNGEN];
  return alle.find((s) => s.name === name) ?? (STIMMUNGEN[0] as Stimmung);
}

export interface Materialien {
  readonly fest: THREE.MeshPhysicalMaterial;
  readonly leuchtend: THREE.MeshBasicMaterial;
}

/** Eine aufgebaute Buehne mit Karte. */
export class Buehne {
  readonly renderer: THREE.WebGLRenderer;
  readonly szene = new THREE.Scene();
  readonly kamera: THREE.PerspectiveCamera;
  readonly materialien: Materialien;
  readonly materialienGegner: Materialien;
  readonly insel: InselTeile;
  readonly bodenschatten: Bodenschatten;

  readonly grund: Grundwerte;
  stufe: Stufe = STUFEN[0] as Stufe;

  private readonly himmel: Himmel;
  private readonly sonne: THREE.DirectionalLight;
  private readonly gegenlicht: THREE.DirectionalLight;
  private readonly himmelslicht: THREE.HemisphereLight;
  private readonly fackelLichter: THREE.PointLight[] = [];
  private readonly komponist: EffectComposer;
  private readonly bluehen: UnrealBloomPass;
  private readonly tiltWaagerecht: ShaderPass;
  private readonly tiltSenkrecht: ShaderPass;
  private readonly abzug: ShaderPass;
  private readonly kanten: SMAAPass;
  private readonly renderDurchgang: RenderPass;
  private readonly ausgabe = new OutputPass();
  private breite = 1;
  private hoehe = 1;

  constructor(
    leinwand: HTMLCanvasElement,
    level: LevelDef,
    modelle: ReadonlyMap<string, ModellBau>,
    stimmung = 'Werkbank',
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Ohne das setzt jeder Renderdurchgang den Zaehler selbst zurueck, und
    // die Nachbearbeitung besteht aus mehreren.
    this.renderer.info.autoReset = false;

    this.himmel = baueHimmel(70);
    this.szene.add(this.himmel.netz);
    this.szene.fog = new THREE.FogExp2(0x93a6a8, 0.004);

    this.kamera = new THREE.PerspectiveCamera(32, 1, 1, 160);

    const farben = REGIONEN[level.region as Region];
    this.sonne = new THREE.DirectionalLight(0xffffff, 3);
    this.sonne.castShadow = true;
    const weite = Math.max(level.breite, level.hoehe) * 0.8;
    this.sonne.shadow.camera.left = -weite;
    this.sonne.shadow.camera.right = weite;
    this.sonne.shadow.camera.top = weite;
    this.sonne.shadow.camera.bottom = -weite;
    this.sonne.shadow.camera.far = 90;
    this.sonne.shadow.bias = -0.0012;
    this.sonne.shadow.normalBias = 0.02;
    this.szene.add(this.sonne, this.sonne.target);
    this.sonne.target.position.set(level.breite / 2, 0, level.hoehe / 2);
    this.sonne.target.updateMatrixWorld();

    this.gegenlicht = new THREE.DirectionalLight(0xffffff, 1.6);
    this.gegenlicht.position.set(level.breite, 9, level.hoehe * 1.4);
    this.szene.add(this.gegenlicht);

    this.himmelslicht = new THREE.HemisphereLight(0xffffff, farben.sockel, 2.2);
    this.szene.add(this.himmelslicht);

    this.materialien = {
      fest: machKnete(
        new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          roughness: 0.62,
          metalness: 0,
          clearcoat: 0.35,
          clearcoatRoughness: 0.55,
        }),
      ),
      leuchtend: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    this.materialienGegner = {
      fest: machKnete(
        new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          roughness: 0.6,
          metalness: 0,
          clearcoat: 0.35,
          clearcoatRoughness: 0.55,
          emissive: new THREE.Color(0x24313f),
          emissiveIntensity: 0.55,
        }),
      ),
      leuchtend: this.materialien.leuchtend,
    };

    this.insel = baueInsel(level, modelle, this.materialien, true);
    this.szene.add(this.insel.gruppe);

    // Fackeln leuchten wirklich. Bewusst nur die ersten sechs: jedes weitere
    // Licht kostet einen Durchgang je Flaeche.
    for (const prop of level.props.filter((p) => p.model === 'prop_fackel').slice(0, 6)) {
      const licht = new THREE.PointLight(0xffb060, 0, 7, 1.7);
      licht.position.set(prop.x, HOEHE.boden + 0.95, prop.y);
      this.szene.add(licht);
      this.fackelLichter.push(licht);
    }

    this.bodenschatten = baueBodenschatten(600);
    this.szene.add(this.bodenschatten.netz);

    this.komponist = new EffectComposer(this.renderer);
    this.renderDurchgang = new RenderPass(this.szene, this.kamera);
    this.bluehen = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.55);
    this.tiltWaagerecht = new ShaderPass(TiltShiftShader);
    this.tiltSenkrecht = new ShaderPass(TiltShiftShader);
    const senkrecht = this.tiltSenkrecht.uniforms['senkrecht'];
    if (senkrecht !== undefined) senkrecht.value = 1;
    this.abzug = new ShaderPass(AbzugShader);
    this.kanten = new SMAAPass();

    this.grund = { ...(STIMMUNGEN[0] as Stimmung).werte } as Grundwerte;
    this.setzeStimmung(stimmung);
    this.setzeStufe(STUFEN[0] as Stufe);
  }

  private feld(durchgang: ShaderPass, name: string): { value: number } {
    const u = durchgang.uniforms[name] as { value: number } | undefined;
    if (u === undefined) throw new Error(`Uniform ${name} fehlt.`);
    return u;
  }

  setzeStimmung(name: string): void {
    const stimmung = stimmungNach(name);
    Object.assign(this.grund, stimmung.werte);
    const f = stimmung.farben;
    this.himmel.setze(f.himmelOben, f.himmelUnten, f.schimmer);
    (this.szene.fog as THREE.FogExp2).color.set(f.nebel);
    this.sonne.color.set(f.sonne);
    this.gegenlicht.color.set(f.gegen);
    this.himmelslicht.color.set(f.himmel);
    this.himmelslicht.groundColor.set(f.boden);
    knetWerte.randFarbe.value.set(f.saum);
    this.wendeAn();
  }

  /** Rechnet aus, was das Geraet von den Grundwerten bekommt. */
  wendeAn(): void {
    const g = this.grund;
    const s = this.stufe;
    this.renderer.toneMappingExposure = g.belichtung;
    this.sonne.intensity = g.sonne;
    this.gegenlicht.intensity = g.gegenlicht;
    this.himmelslicht.intensity = g.himmelslicht;
    const r = 26;
    this.sonne.position.set(
      this.sonne.target.position.x + Math.cos(g.sonnenrichtung) * Math.cos(g.sonnenhoehe) * r,
      Math.sin(g.sonnenhoehe) * r,
      this.sonne.target.position.z + Math.sin(g.sonnenrichtung) * Math.cos(g.sonnenhoehe) * r,
    );
    this.fackelLichter.forEach((licht, i) => {
      licht.intensity = i < s.lichter ? g.fackeln : 0;
    });
    this.materialien.fest.roughness = g.rauheit;
    this.materialienGegner.fest.roughness = g.rauheit;
    this.materialien.fest.clearcoat = g.lack * s.lack;
    this.materialienGegner.fest.clearcoat = g.lack * s.lack;
    knetWerte.korn.value = g.korn * s.korn;
    knetWerte.beulen.value = g.beulen * s.korn;
    knetWerte.rand.value = g.randlicht;
    knetWerte.kehle.value = g.kehlen;
    this.bodenschatten.material.opacity = g.bodenschatten;
    (this.szene.fog as THREE.FogExp2).density = g.dunst;
    this.bluehen.strength = g.bluehen;
    for (const p of [this.tiltWaagerecht, this.tiltSenkrecht]) {
      this.feld(p, 'staerke').value = g.unschaerfe;
      this.feld(p, 'breite').value = g.schaerfeband;
    }
    this.feld(this.abzug, 'koernung').value = g.koernung;
    this.feld(this.abzug, 'abschattung').value = g.abschattung;
    this.feld(this.abzug, 'saettigung').value = g.saettigung;
    this.feld(this.abzug, 'toenung').value = g.toenung;
    this.insel.wasser?.(s.tiefesWasser);
  }

  setzeStufe(stufe: Stufe): void {
    this.stufe = stufe;
    this.renderer.shadowMap.enabled = stufe.schatten > 0;
    this.sonne.castShadow = stufe.schatten > 0;
    if (stufe.schatten > 0) {
      this.sonne.shadow.mapSize.set(stufe.schatten, stufe.schatten);
      this.sonne.shadow.map?.dispose();
      this.sonne.shadow.map = null;
    }
    this.komponist.passes.length = 0;
    this.komponist.addPass(this.renderDurchgang);
    if (stufe.bluehen) this.komponist.addPass(this.bluehen);
    if (stufe.tiltShift) {
      this.komponist.addPass(this.tiltWaagerecht);
      this.komponist.addPass(this.tiltSenkrecht);
    }
    this.komponist.addPass(this.abzug);
    this.komponist.addPass(this.ausgabe);
    if (stufe.kanten) this.komponist.addPass(this.kanten);
    this.wendeAn();
    this.setzeGroesse(this.breite, this.hoehe);
  }

  setzeGroesse(breite: number, hoehe: number): void {
    this.breite = Math.max(1, breite);
    this.hoehe = Math.max(1, hoehe);
    const dpr = Math.min(this.stufe.aufloesung, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.breite, this.hoehe, false);
    this.komponist.setPixelRatio(dpr);
    this.komponist.setSize(this.breite, this.hoehe);
    this.kanten.setSize(this.breite * dpr, this.hoehe * dpr);
    this.bluehen.resolution.set(this.breite, this.hoehe);
    this.kamera.aspect = this.breite / this.hoehe;
    this.kamera.updateProjectionMatrix();
    for (const p of [this.tiltWaagerecht, this.tiltSenkrecht]) {
      const u = p.uniforms['aufloesung'] as { value: THREE.Vector2 } | undefined;
      u?.value.set(this.breite * dpr, this.hoehe * dpr);
    }
  }

  /** Zeichnet ein Bild und gibt die Zahl der Zeichenbefehle zurueck. */
  rendere(zeit: number): number {
    this.himmel.netz.position.copy(this.kamera.position);
    this.feld(this.abzug, 'zeit').value = zeit;
    this.renderer.info.reset();
    this.komponist.render();
    return this.renderer.info.render.calls;
  }

  zerstoere(): void {
    this.komponist.dispose();
    this.renderer.dispose();
    this.szene.traverse((knoten) => {
      if (knoten instanceof THREE.Mesh) knoten.geometry.dispose();
    });
  }
}
